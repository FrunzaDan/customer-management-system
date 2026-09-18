using CustomerManagementSystem.BusinessLogic.Services;
using CustomerManagementSystem.Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CustomerManagementSystem.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthenticationController(IAuthService authService) : ControllerBase
{
    [HttpPost("access-token")]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> GetAccessToken([FromBody] MerchantCredentials merchantCredentials,
        CancellationToken cancellationToken)
    {
        var response = await authService.GetAccessToken(merchantCredentials, cancellationToken);
        return StatusCode(response.Status ?? 200, response);
    }

    [Authorize]
    [HttpGet("verify-token")]
    public ActionResult<ResponseModel<object>> VerifyToken()
    {
        // Reaching this point means the [Authorize] middleware already validated the bearer token.
        return Ok(new ResponseModel<object>(200, "Authorized: Valid claims."));
    }
}