using CustomerManagementSystem.BusinessLogic.Contracts;

namespace CustomerManagementSystem.BusinessLogic.Features.Auth;

public class GetAccessTokenHandler(JwtCreation jwtCreation)
{
    public async Task<ResponseModel<AccessTokenResponse>> HandleAsync(MerchantCredentials merchantCredentials,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(merchantCredentials.Username) ||
            string.IsNullOrWhiteSpace(merchantCredentials.Password))
            return new ResponseModel<AccessTokenResponse>(400, "Username and password are required.");

        return await jwtCreation.GenerateBearerJwtAsync(merchantCredentials, cancellationToken);
    }
}
