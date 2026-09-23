using CustomerManagementSystem.Domain.Models;
using Microsoft.AspNetCore.Diagnostics;

namespace CustomerManagementSystem.WebAPI.ErrorHandling;

// The one place an unexpected exception becomes a response (registered with AddExceptionHandler,
// run by UseExceptionHandler). Expected failures are ResponseModel results with their own status;
// anything thrown bubbles up here, is logged once, and the client gets a 500 in the same
// ResponseModel envelope as every other reply. A request the client aborted never gets here —
// UseExceptionHandler answers those with 499.
public sealed class GlobalExceptionHandler(IHostEnvironment environment, ILogger<GlobalExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception,
        CancellationToken cancellationToken)
    {
        logger.LogError(exception, "Unhandled exception while processing {Method} {Path}",
            httpContext.Request.Method, httpContext.Request.Path);

        // Exception messages can carry SQL, connection-string or schema details, so they only
        // reach the client in Development.
        var message = environment.IsDevelopment()
            ? $"An error occurred while processing your request: {exception.Message}"
            : "An error occurred while processing your request.";

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await httpContext.Response.WriteAsJsonAsync(
            new ResponseModel<object>(StatusCodes.Status500InternalServerError, message), cancellationToken);
        return true;
    }
}
