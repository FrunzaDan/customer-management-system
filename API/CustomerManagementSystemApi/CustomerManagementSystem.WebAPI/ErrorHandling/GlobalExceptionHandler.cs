using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace CustomerManagementSystem.WebAPI.ErrorHandling;

// The one place an unexpected exception becomes a response (registered with AddExceptionHandler,
// run by UseExceptionHandler). Controllers, services and DbUtils don't catch-and-log: an
// exception bubbles up here, is logged once, and the client gets a 500 Problem Details body.
// A request the client aborted never gets here — UseExceptionHandler answers those with 499.
public sealed class GlobalExceptionHandler(
    IProblemDetailsService problemDetailsService,
    IHostEnvironment environment,
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception,
        CancellationToken cancellationToken)
    {
        logger.LogError(exception, "Unhandled exception while processing {Method} {Path}",
            httpContext.Request.Method, httpContext.Request.Path);

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;

        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = "An error occurred while processing your request.",
                // Exception messages can carry SQL, connection-string or schema details, so they
                // only reach the client in Development.
                Detail = environment.IsDevelopment() ? exception.Message : null,
            },
        });
    }
}
