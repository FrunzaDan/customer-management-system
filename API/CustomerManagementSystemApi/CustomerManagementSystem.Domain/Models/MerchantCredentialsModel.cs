namespace CustomerManagementSystem.Domain.Models;

// No [Required] here deliberately: with [ApiController], data-annotation failures are
// intercepted by ASP.NET's automatic model validation before the controller action runs,
// returning its own ValidationProblemDetails shape instead of this app's uniform
// ResponseModel envelope. AuthService.GetAccessToken is the single place that validates
// these fields, so every empty-credentials case gets the same 403 ResponseModel response.
public sealed class MerchantCredentials
{
    public string? MerchantId { get; set; }

    public string? MerchantPassword { get; set; }
}