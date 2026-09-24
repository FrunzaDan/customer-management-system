using CustomerManagementSystem.BusinessLogic.Services;
using CustomerManagementSystem.Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CustomerManagementSystem.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthenticationController(IAuthService authService) : ApiControllerBase
{
    [HttpPost("access-token")]
    [EnableRateLimiting("login")]
    public async Task<ActionResult<ResponseModel<AccessTokenResponse>>> GetAccessToken(
        [FromBody] MerchantCredentials merchantCredentials, CancellationToken cancellationToken) =>
        Reply(await authService.GetAccessTokenAsync(merchantCredentials, cancellationToken));

    [Authorize]
    [HttpGet("verify-token")]
    public ActionResult<ResponseModel<object>> VerifyToken()
    {
        // Reaching this point means the [Authorize] middleware already validated the bearer token.
        return Ok(new ResponseModel<object>(200, "Authorized: Valid claims."));
    }
}