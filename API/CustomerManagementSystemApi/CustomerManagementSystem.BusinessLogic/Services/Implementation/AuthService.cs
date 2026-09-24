using CustomerManagementSystem.BusinessLogic.AuthFunctions;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Services.Implementation;

public class AuthService(JwtCreation jwtCreation) : IAuthService
{
    public async Task<ResponseModel<AccessTokenResponse>> GetAccessTokenAsync(MerchantCredentials merchantCredentials,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(merchantCredentials.Username) ||
            string.IsNullOrWhiteSpace(merchantCredentials.Password))
            return new ResponseModel<AccessTokenResponse>(400, "Username and password are required.");

        return await jwtCreation.GenerateBearerJwtAsync(merchantCredentials, cancellationToken);
    }
}