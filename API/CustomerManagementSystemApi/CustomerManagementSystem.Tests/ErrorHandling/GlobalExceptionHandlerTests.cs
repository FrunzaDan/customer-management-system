using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Moq;
using CustomerManagementSystem.WebAPI.ErrorHandling;

namespace CustomerManagementSystem.Tests.ErrorHandling;

public class GlobalExceptionHandlerTests
{
    private static (GlobalExceptionHandler Handler, FakeLogger<GlobalExceptionHandler> Logger,
        Mock<IProblemDetailsService> ProblemDetails) CreateHandler()
    {
        var problemDetails = new Mock<IProblemDetailsService>();
        problemDetails.Setup(p => p.TryWriteAsync(It.IsAny<ProblemDetailsContext>())).ReturnsAsync(true);
        var environment = new Mock<IHostEnvironment>();
        environment.Setup(e => e.EnvironmentName).Returns(Environments.Production);
        var logger = new FakeLogger<GlobalExceptionHandler>();
        return (new GlobalExceptionHandler(problemDetails.Object, environment.Object, logger), logger, problemDetails);
    }

    [Fact]
    public async Task AbortedRequest_Returns499_WithoutAnErrorLogOrProblemBody()
    {
        var (handler, logger, problemDetails) = CreateHandler();
        using var aborted = new CancellationTokenSource();
        await aborted.CancelAsync();
        var httpContext = new DefaultHttpContext { RequestAborted = aborted.Token };

        var handled = await handler.TryHandleAsync(httpContext, new OperationCanceledException(aborted.Token),
            TestContext.Current.CancellationToken);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status499ClientClosedRequest, httpContext.Response.StatusCode);
        Assert.DoesNotContain(logger.Collector.GetSnapshot(), r => r.Level >= LogLevel.Warning);
        problemDetails.Verify(p => p.TryWriteAsync(It.IsAny<ProblemDetailsContext>()), Times.Never);
    }

    [Fact]
    public async Task FailureOnALiveRequest_Returns500_AndLogsAnError()
    {
        var (handler, logger, _) = CreateHandler();
        var httpContext = new DefaultHttpContext();

        var handled = await handler.TryHandleAsync(httpContext, new InvalidOperationException("Boom"),
            TestContext.Current.CancellationToken);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status500InternalServerError, httpContext.Response.StatusCode);
        Assert.Contains(logger.Collector.GetSnapshot(), r => r.Level == LogLevel.Error);
    }
}
