using System.Text.Json;
using CustomerManagementSystem.WebAPI.ErrorHandling;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace CustomerManagementSystem.Tests.ErrorHandling;

public class GlobalExceptionHandlerTests
{
    private static async Task<(bool handled, HttpContext context, JsonElement body)> HandleAsync(
        string environmentName, Exception exception)
    {
        var environment = new Mock<IHostEnvironment>();
        environment.Setup(e => e.EnvironmentName).Returns(environmentName);
        var handler = new GlobalExceptionHandler(environment.Object, NullLogger<GlobalExceptionHandler>.Instance);
        var context = new DefaultHttpContext { Response = { Body = new MemoryStream() } };

        var handled = await handler.TryHandleAsync(context, exception, TestContext.Current.CancellationToken);

        context.Response.Body.Position = 0;
        var body = (await JsonDocument.ParseAsync(context.Response.Body,
            cancellationToken: TestContext.Current.CancellationToken)).RootElement;
        return (handled, context, body);
    }

    [Fact]
    public async Task TryHandleAsync_Answers500_InTheResponseModelEnvelope()
    {
        var (handled, context, body) = await HandleAsync(Environments.Production, new InvalidOperationException("boom"));

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
        Assert.Equal(500, body.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task TryHandleAsync_HidesTheExceptionMessage_OutsideDevelopment()
    {
        var (_, _, body) = await HandleAsync(Environments.Production,
            new InvalidOperationException("Login failed for user 'sa'."));

        Assert.Equal("An error occurred while processing your request.",
            body.GetProperty("responseMessage").GetString());
    }

    [Fact]
    public async Task TryHandleAsync_IncludesTheExceptionMessage_InDevelopment()
    {
        var (_, _, body) = await HandleAsync(Environments.Development,
            new InvalidOperationException("Login failed for user 'sa'."));

        Assert.Equal("An error occurred while processing your request: Login failed for user 'sa'.",
            body.GetProperty("responseMessage").GetString());
    }
}
