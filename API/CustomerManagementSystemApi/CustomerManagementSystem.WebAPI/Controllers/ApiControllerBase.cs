using CustomerManagementSystem.Domain.Models;
using Microsoft.AspNetCore.Mvc;

namespace CustomerManagementSystem.WebAPI.Controllers;

public abstract class ApiControllerBase : ControllerBase
{
    protected ObjectResult Reply<T>(ResponseModel<T> response) =>
        response.Status < StatusCodes.Status400BadRequest
            ? StatusCode(response.Status, response)
            : Problem(detail: response.ResponseMessage, statusCode: response.Status);
}
