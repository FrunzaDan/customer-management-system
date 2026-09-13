using CustomerManagementSystem.BusinessLogic.AuthFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Configuration;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Services.Implementation;

public class AuthService(
    IAppSettingsConfig appSettingsConfig,
    IDbUtils dbUtils)
    : IAuthService
{
    public async Task<ResponseModel<object>> GetAccessToken(MerchantCredentials merchantCredentials,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(merchantCredentials.MerchantId) ||
            string.IsNullOrWhiteSpace(merchantCredentials.MerchantPassword))
            return new ResponseModel<object>(403, "Invalid or empty merchant credentials.");

        var jwtCreation = new JwtCreation(appSettingsConfig, dbUtils);
        return await jwtCreation.GenerateBearerJwt(merchantCredentials, cancellationToken);
    }
}