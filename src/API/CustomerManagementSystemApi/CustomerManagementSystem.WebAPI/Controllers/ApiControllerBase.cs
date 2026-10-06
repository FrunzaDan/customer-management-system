using System.Text.Json;
using CustomerManagementSystem.BusinessLogic.Contracts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace CustomerManagementSystem.WebAPI.Controllers;

public abstract class ApiControllerBase : ControllerBase
{
    protected ObjectResult Reply<T>(ResponseModel<T> response)
    {
        if (response.Status < StatusCodes.Status400BadRequest)
            return StatusCode(response.Status, response);

        if (response.Field is null)
            return Problem(detail: response.ResponseMessage, statusCode: response.Status);

        // A failure about one property comes back in the validation format, keyed by the
        // property's JSON name, so the UI can show it next to that field.
        var errors = new ModelStateDictionary();
        errors.AddModelError(JsonNamingPolicy.CamelCase.ConvertName(response.Field),
            response.ResponseMessage ?? "Invalid value.");
        return (ObjectResult)ValidationProblem(detail: response.ResponseMessage, statusCode: response.Status,
            modelStateDictionary: errors);
    }
}
