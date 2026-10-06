using System.Globalization;
using System.Net;
using System.Security.Claims;
using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.Auth;
using CustomerManagementSystem.Domain.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Moq;

namespace CustomerManagementSystem.Tests.Security;

public class EndpointAuthorizationTests
{
    private const string SigningKey = "test-signing-key-that-is-at-least-32-bytes-long";
    private const string Issuer = "test-issuer";
    private const string Audience = "test-audience";
    private const string DeleteAllAuditLogUrl = "/api/customer/audit-log/all";

    // The only API endpoints a caller may reach without a token.
    private static readonly HashSet<string> AnonymousEndpoints = ["POST /api/authentication/access-token"];

    private static WebApplicationFactory<Program> CreateFactory(Mock<ICustomerRepository>? customers = null,
        Mock<IAuditLogRepository>? auditLog = null) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("Auth:SecureJwtKey", SigningKey);
            builder.UseSetting("Auth:JwtIssuer", Issuer);
            builder.UseSetting("Auth:JwtAudience", Audience);
            builder.ConfigureTestServices(services =>
            {
                services.AddSingleton((customers ?? new Mock<ICustomerRepository>()).Object);
                services.AddSingleton((auditLog ?? new Mock<IAuditLogRepository>()).Object);
            });
        });

    private static string CreateToken(string role, string issuer = Issuer) =>
        new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity([
                new Claim(JwtRegisteredClaimNames.Sub, "TestMerchant"),
                new Claim(JwtRegisteredClaimNames.UniqueName, "TestMerchant"),
                new Claim("role", role)
            ]),
            Expires = DateTime.UtcNow.AddMinutes(5),
            SigningCredentials = new SigningCredentials(JwtSigningKey.Create(SigningKey),
                SecurityAlgorithms.HmacSha256Signature),
            Issuer = issuer,
            Audience = Audience
        });

    // HTTPS from the start: following the HTTP-to-HTTPS redirect would drop the Authorization header.
    private static HttpClient CreateClient(WebApplicationFactory<Program> factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });

    private static IEnumerable<string> ApiEndpoints(WebApplicationFactory<Program> factory) =>
        factory.Services.GetRequiredService<EndpointDataSource>().Endpoints
            .OfType<RouteEndpoint>()
            .Where(e => e.RoutePattern.RawText?.StartsWith("api/", StringComparison.Ordinal) == true)
            .SelectMany(e => (e.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? [])
                .Select(method => $"{method} /{e.RoutePattern.RawText}"))
            .Distinct();

    private static HttpRequestMessage Request(string endpoint, string? token = null)
    {
        var parts = endpoint.Split(' ');
        var request = new HttpRequestMessage(new HttpMethod(parts[0]), parts[1]);
        if (token is not null)
            request.Headers.Authorization = new("Bearer", token);
        return request;
    }

    [Fact]
    public async Task EveryApiEndpoint_RejectsAnAnonymousCaller_ExceptTheLogin()
    {
        await using var factory = CreateFactory();
        var client = CreateClient(factory);
        var endpoints = ApiEndpoints(factory).ToList();
        Assert.NotEmpty(endpoints);
        Assert.Subset(endpoints.ToHashSet(), AnonymousEndpoints);

        var open = new List<string>();
        foreach (var endpoint in endpoints.Except(AnonymousEndpoints))
        {
            var response = await client.SendAsync(Request(endpoint), TestContext.Current.CancellationToken);
            if (response.StatusCode != HttpStatusCode.Unauthorized)
                open.Add($"{endpoint} -> {(int)response.StatusCode}");
        }

        Assert.Empty(open);
    }

    [Fact]
    public async Task AToken_FromAnotherIssuer_IsRejected()
    {
        await using var factory = CreateFactory();

        var response = await CreateClient(factory).SendAsync(
            Request("GET /api/authentication/verify-token", CreateToken("1801", issuer: "someone-else")),
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("1802")]
    public async Task DeletingTheWholeAuditLog_IsForbidden_WithoutTheMerchantRole(string role)
    {
        var auditLog = new Mock<IAuditLogRepository>();
        await using var factory = CreateFactory(auditLog: auditLog);

        var response = await CreateClient(factory).SendAsync(
            Request($"DELETE {DeleteAllAuditLogUrl}", CreateToken(role)), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        auditLog.Verify(a => a.DeleteAllCustomerAuditLogAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeletingTheWholeAuditLog_IsAllowed_WithTheMerchantRole()
    {
        var auditLog = new Mock<IAuditLogRepository>();
        auditLog.Setup(a => a.DeleteAllCustomerAuditLogAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<object>(200, "Audit log cleared."));
        await using var factory = CreateFactory(auditLog: auditLog);

        var response = await CreateClient(factory).SendAsync(
            Request($"DELETE {DeleteAllAuditLogUrl}", CreateToken(((short)MerchantRole.Merchant).ToString(CultureInfo.InvariantCulture))),
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        auditLog.Verify(a => a.DeleteAllCustomerAuditLogAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task TheSignedInUsername_IsRecordedAsWhoMadeTheChange()
    {
        var customers = new Mock<ICustomerRepository>();
        customers.Setup(c => c.DeleteCustomerAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<object>(200, "Customer deleted successfully."));
        var auditLog = new Mock<IAuditLogRepository>();
        await using var factory = CreateFactory(customers, auditLog);
        var customerId = Guid.NewGuid();

        await CreateClient(factory).SendAsync(
            Request($"DELETE /api/customer/delete?customerId={customerId}", CreateToken("1801")),
            TestContext.Current.CancellationToken);

        auditLog.Verify(a => a.LogCustomerAuditAsync(customerId, "TestMerchant", AuditAction.Deleted, It.IsAny<string?>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
