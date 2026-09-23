using CustomerManagementSystem.BusinessLogic.AuthFunctions;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Services.Implementation;

public class AuthService(JwtCreation jwtCreation) : IAuthService
{
    public async Task<ResponseModel<AccessTokenResponse>> GetAccessToken(MerchantCredentials merchantCredentials,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(merchantCredentials.Username) ||
            string.IsNullOrWhiteSpace(merchantCredentials.Password))
            return new ResponseModel<AccessTokenResponse>(403, "Invalid or empty merchant credentials.");

        return await jwtCreation.GenerateBearerJwt(merchantCredentials, cancellationToken);
    }
}