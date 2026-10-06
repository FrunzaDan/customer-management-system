using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CustomerManagementSystem.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthenticationController : ApiControllerBase
{
    [HttpPost("access-token")]
    [EnableRateLimiting("login")]
    public async Task<ActionResult<ResponseModel<AccessTokenResponse>>> GetAccessToken(
        [FromBody] MerchantCredentials merchantCredentials, [FromServices] GetAccessTokenHandler handler,
        CancellationToken cancellationToken) =>
        Reply(await handler.HandleAsync(merchantCredentials, cancellationToken));

    [Authorize]
    [HttpGet("verify-token")]
    public ActionResult<ResponseModel<object>> VerifyToken()
    {
        return Ok(new ResponseModel<object>(200, "Authorized: Valid claims."));
    }
}
