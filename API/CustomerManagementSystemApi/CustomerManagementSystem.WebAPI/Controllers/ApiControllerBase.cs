using CustomerManagementSystem.Domain.Models;
using Microsoft.AspNetCore.Mvc;

namespace CustomerManagementSystem.WebAPI.Controllers;

// Base for every controller: turns a service's ResponseModel into the HTTP reply. A success is
// the ResponseModel envelope with its status; a failure (4xx) is an RFC 9457 Problem Details
// body (application/problem+json) with the message as its "detail" — the same error shape as
// model-binding failures, unhandled exceptions (GlobalExceptionHandler) and bare status codes.
public abstract class ApiControllerBase : ControllerBase
{
    protected ObjectResult Reply<T>(ResponseModel<T> response) =>
        response.Status < StatusCodes.Status400BadRequest
            ? StatusCode(response.Status, response)
            : Problem(detail: response.ResponseMessage, statusCode: response.Status);
}
