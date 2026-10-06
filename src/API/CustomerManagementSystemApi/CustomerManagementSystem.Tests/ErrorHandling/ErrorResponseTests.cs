using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.Tests.Endpoints;
using CustomerManagementSystem.Tests.Features.Auth;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Moq;

namespace CustomerManagementSystem.Tests.ErrorHandling;

public class ErrorResponseTests
{
    private const string AccessTokenUrl = "/api/authentication/access-token";

    private static WebApplicationFactory<Program> CreateFactory(Mock<IMerchantRepository> merchants,
        string environment = "Development", Mock<IAuditLogRepository>? auditLog = null) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            builder.ConfigureLogging(logging => logging.AddFakeLogging());
            builder.UseSetting("Auth:SecureJwtKey", "test-signing-key-that-is-at-least-32-bytes-long");
            builder.UseSetting("Auth:JwtIssuer", "test-issuer");
            builder.UseSetting("Auth:JwtAudience", "test-audience");
            builder.ConfigureTestServices(services =>
            {
                services.AddSingleton(merchants.Object);
                services.AddSingleton((auditLog ?? new Mock<IAuditLogRepository>()).Object);
            });
        });

    private static StringContent Json(string json) => new(json, Encoding.UTF8, "application/json");

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
        var merchants = new Mock<IMerchantRepository>();
        merchants.Setup(m => m.GetMerchantAuthDataAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Login failed for user 'sa'."));
        await using var factory = CreateFactory(merchants, environment);

        var response = await factory.CreateClient().PostAsync(AccessTokenUrl,
            Json("""{"username":"u","password":"p"}"""), TestContext.Current.CancellationToken);

        var problem = await ReadProblemAsync(response, HttpStatusCode.InternalServerError);
        Assert.Equal("An error occurred while processing your request.", problem.GetProperty("title").GetString());
        Assert.Equal(exposesMessage, problem.TryGetProperty("detail", out var detail));
        if (exposesMessage) Assert.Equal("Login failed for user 'sa'.", detail.GetString());

        var error = Assert.Single(factory.Services.GetFakeLogCollector().GetSnapshot(),
            record => record.Level >= LogLevel.Error);
        Assert.Equal(1, error.Id.Id);
        Assert.IsType<InvalidOperationException>(error.Exception);
    }

    [Fact]
    public async Task FailedResult_ReturnsProblem_WithItsStatusAndMessageAsDetail()
    {
        // An unknown username: the login fails with 401.
        await using var factory = CreateFactory(new Mock<IMerchantRepository>());

        var response = await factory.CreateClient().PostAsync(AccessTokenUrl,
            Json("""{"username":"u","password":"wrong"}"""), TestContext.Current.CancellationToken);

        var problem = await ReadProblemAsync(response, HttpStatusCode.Unauthorized);
        Assert.Equal("Invalid username or password.", problem.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task FailedResult_AboutOneField_ReturnsValidationProblem_KeyedByTheFieldsJsonName()
    {
        // Clearing the audit log hands the repository's result straight back, so any result can be returned.
        var auditLog = new Mock<IAuditLogRepository>();
        auditLog.Setup(a => a.DeleteAllCustomerAuditLogAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<object>(409, "Phone number already exists.", field: "PhoneNumber"));
        await using var factory = CreateFactory(new Mock<IMerchantRepository>(), auditLog: auditLog);
        var client = factory.CreateClient(
            new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        client.DefaultRequestHeaders.Authorization = new("Bearer", ApiHost.CreateToken());

        var response = await client.DeleteAsync("/api/customer/audit-log/all", TestContext.Current.CancellationToken);

        var problem = await ReadProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Equal("Phone number already exists.", problem.GetProperty("detail").GetString());
        var fieldErrors = problem.GetProperty("errors").GetProperty("phoneNumber");
        Assert.Equal("Phone number already exists.", Assert.Single(fieldErrors.EnumerateArray()).GetString());
    }

    [Fact]
    public async Task SuccessfulResult_IsStillTheResponseModelEnvelope()
    {
        var merchants = new Mock<IMerchantRepository>();
        merchants.SetupMerchant("p");
        await using var factory = CreateFactory(merchants);

        var response = await factory.CreateClient().PostAsync(AccessTokenUrl,
            Json("""{"username":"u","password":"p"}"""), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(200, body.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrEmpty(body.GetProperty("data").GetProperty("accessToken").GetString()));
    }

    [Fact]
    public async Task MalformedJson_Returns400ValidationProblem_WithoutCallingTheHandler()
    {
        var merchants = new Mock<IMerchantRepository>();
        await using var factory = CreateFactory(merchants);

        var response = await factory.CreateClient().PostAsync(AccessTokenUrl, Json("""{"username":"""),
            TestContext.Current.CancellationToken);

        var problem = await ReadProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.True(problem.TryGetProperty("errors", out _));
        merchants.Verify(m => m.GetMerchantAuthDataAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task MissingBearerToken_Returns401Problem()
    {
        await using var factory = CreateFactory(new Mock<IMerchantRepository>());

        var response = await factory.CreateClient().GetAsync("/api/authentication/verify-token",
            TestContext.Current.CancellationToken);

        await ReadProblemAsync(response, HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UnknownRoute_Returns404Problem()
    {
        await using var factory = CreateFactory(new Mock<IMerchantRepository>());

        var response = await factory.CreateClient().GetAsync("/api/does-not-exist",
            TestContext.Current.CancellationToken);

        await ReadProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task EveryRequest_WritesOneAccessLogLine_ExceptTheHealthPoll()
    {
        await using var factory = CreateFactory(new Mock<IMerchantRepository>());
        var client = factory.CreateClient(
            new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });

        var response = await client.GetAsync("/api/no-such-route", TestContext.Current.CancellationToken);
        await client.GetAsync("/health", TestContext.Current.CancellationToken);

        var accessLog = Assert.Single(factory.Services.GetFakeLogCollector().GetSnapshot(),
            record => record.Category == "Microsoft.AspNetCore.HttpLogging.HttpLoggingMiddleware");
        Assert.Equal(LogLevel.Information, accessLog.Level);
        Assert.Equal("GET", accessLog.GetStructuredStateValue("Method"));
        Assert.Equal("/api/no-such-route", accessLog.GetStructuredStateValue("Path"));
        Assert.Equal(((int)response.StatusCode).ToString(CultureInfo.InvariantCulture), accessLog.GetStructuredStateValue("StatusCode"));
    }
}
