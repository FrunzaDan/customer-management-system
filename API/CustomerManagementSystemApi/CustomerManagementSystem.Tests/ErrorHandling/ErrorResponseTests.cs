using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using CustomerManagementSystem.BusinessLogic.Services;
using CustomerManagementSystem.Domain.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Moq;

namespace CustomerManagementSystem.Tests.ErrorHandling;

// Runs the real request pipeline in memory (WebApplicationFactory) with a mocked service layer, so
// what's pinned here is what a client actually receives: every error is RFC 9457 Problem Details
// (application/problem+json), whether it comes from a failed ResponseModel result, model
// validation, a missing bearer token, an unmatched route or an unhandled exception — while a
// success is still the ResponseModel envelope. Same cases as Imalo's ErrorResponseTests.
public class ErrorResponseTests
{
    private const string AccessTokenUrl = "/api/authentication/access-token";

    private static WebApplicationFactory<Program> CreateFactory(Mock<IAuthService> authService,
        string environment = "Development") =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            // Captures what the app logs, next to the console, for the logging assertions below.
            builder.ConfigureLogging(logging => logging.AddFakeLogging());
            // Program.cs refuses to start without these; nothing here signs or validates a token.
            builder.UseSetting("Auth:SecureJwtKey", "test-signing-key-that-is-at-least-32-bytes-long");
            builder.UseSetting("Auth:JwtIssuer", "test-issuer");
            builder.UseSetting("Auth:JwtAudience", "test-audience");
            builder.ConfigureTestServices(services => services.AddScoped(_ => authService.Object));
        });

    private static StringContent Json(string json) => new(json, Encoding.UTF8, "application/json");

    private static void SetupAccessToken(Mock<IAuthService> authService,
        ResponseModel<AccessTokenResponse> response) =>
        authService.Setup(a => a.GetAccessTokenAsync(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

    private static async Task<JsonElement> ReadProblemAsync(HttpResponseMessage response, HttpStatusCode expected)
    {
        Assert.Equal(expected, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)).RootElement;
        Assert.Equal((int)expected, problem.GetProperty("status").GetInt32());
        Assert.True(problem.TryGetProperty("traceId", out _), "Every problem carries a traceId to match the log.");
        return problem;
    }

    [Theory]
    [InlineData("Development", true)]
    [InlineData("Production", false)]
    public async Task UnhandledException_Returns500Problem_WithTheMessageOnlyInDevelopment(string environment,
        bool exposesMessage)
    {
        var authService = new Mock<IAuthService>();
        authService.Setup(a => a.GetAccessTokenAsync(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Login failed for user 'sa'."));
        await using var factory = CreateFactory(authService, environment);

        var response = await factory.CreateClient().PostAsync(AccessTokenUrl,
            Json("""{"username":"u","password":"p"}"""), TestContext.Current.CancellationToken);

        var problem = await ReadProblemAsync(response, HttpStatusCode.InternalServerError);
        Assert.Equal("An error occurred while processing your request.", problem.GetProperty("title").GetString());
        Assert.Equal(exposesMessage, problem.TryGetProperty("detail", out var detail));
        if (exposesMessage) Assert.Equal("Login failed for user 'sa'.", detail.GetString());

        // Logged exactly once, by GlobalExceptionHandler (ExceptionHandlerMiddleware doesn't log an
        // exception an IExceptionHandler handled).
        var error = Assert.Single(factory.Services.GetFakeLogCollector().GetSnapshot(),
            record => record.Level >= LogLevel.Error);
        Assert.Equal(1, error.Id.Id);
        Assert.IsType<InvalidOperationException>(error.Exception);
    }

    [Fact]
    public async Task FailedResult_ReturnsProblem_WithItsStatusAndMessageAsDetail()
    {
        var authService = new Mock<IAuthService>();
        SetupAccessToken(authService, new ResponseModel<AccessTokenResponse>(401, "Invalid username or password."));
        await using var factory = CreateFactory(authService);

        var response = await factory.CreateClient().PostAsync(AccessTokenUrl,
            Json("""{"username":"u","password":"wrong"}"""), TestContext.Current.CancellationToken);

        var problem = await ReadProblemAsync(response, HttpStatusCode.Unauthorized);
        Assert.Equal("Invalid username or password.", problem.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task SuccessfulResult_IsStillTheResponseModelEnvelope()
    {
        var authService = new Mock<IAuthService>();
        SetupAccessToken(authService, new ResponseModel<AccessTokenResponse>(200, "Success!",
            new AccessTokenResponse { AccessToken = "token", ExpiresAt = DateTime.UtcNow }));
        await using var factory = CreateFactory(authService);

        var response = await factory.CreateClient().PostAsync(AccessTokenUrl,
            Json("""{"username":"u","password":"p"}"""), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("token", body.GetProperty("data").GetProperty("accessToken").GetString());
    }

    [Fact]
    public async Task MalformedJson_Returns400ValidationProblem_WithoutCallingTheService()
    {
        var authService = new Mock<IAuthService>();
        await using var factory = CreateFactory(authService);

        var response = await factory.CreateClient().PostAsync(AccessTokenUrl, Json("""{"username":"""),
            TestContext.Current.CancellationToken);

        var problem = await ReadProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.True(problem.TryGetProperty("errors", out _));
        authService.Verify(a => a.GetAccessTokenAsync(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task MissingBearerToken_Returns401Problem()
    {
        await using var factory = CreateFactory(new Mock<IAuthService>());

        var response = await factory.CreateClient().GetAsync("/api/authentication/verify-token",
            TestContext.Current.CancellationToken);

        await ReadProblemAsync(response, HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UnknownRoute_Returns404Problem()
    {
        await using var factory = CreateFactory(new Mock<IAuthService>());

        var response = await factory.CreateClient().GetAsync("/api/does-not-exist",
            TestContext.Current.CancellationToken);

        await ReadProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task EveryRequest_WritesOneAccessLogLine_ExceptTheHealthPoll()
    {
        await using var factory = CreateFactory(new Mock<IAuthService>());
        // https, so an HTTP-to-HTTPS redirect doesn't add a second request to the log.
        var client = factory.CreateClient(
            new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });

        var response = await client.GetAsync("/api/no-such-route", TestContext.Current.CancellationToken);
        await client.GetAsync("/health", TestContext.Current.CancellationToken);

        var accessLog = Assert.Single(factory.Services.GetFakeLogCollector().GetSnapshot(),
            record => record.Category == "Microsoft.AspNetCore.HttpLogging.HttpLoggingMiddleware");
        Assert.Equal(LogLevel.Information, accessLog.Level);
        Assert.Equal("GET", accessLog.GetStructuredStateValue("Method"));
        Assert.Equal("/api/no-such-route", accessLog.GetStructuredStateValue("Path"));
        Assert.Equal(((int)response.StatusCode).ToString(), accessLog.GetStructuredStateValue("StatusCode"));
    }
}
