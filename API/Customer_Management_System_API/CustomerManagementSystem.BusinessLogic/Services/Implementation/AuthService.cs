using CustomerManagementSystem.BusinessLogic.AuthFunctions;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Services.Implementation;

public class AuthService(JwtCreation jwtCreation) : IAuthService
{
    public async Task<ResponseModel<object>> GetAccessToken(MerchantCredentials merchantCredentials,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(merchantCredentials.MerchantId) ||
            string.IsNullOrWhiteSpace(merchantCredentials.MerchantPassword))
            return new ResponseModel<object>(403, "Invalid or empty merchant credentials.");

        return await jwtCreation.GenerateBearerJwt(merchantCredentials, cancellationToken);
    }
}