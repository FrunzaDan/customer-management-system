using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Services;

public interface IAuthService
{
    Task<ResponseModel<AccessTokenResponse>> GetAccessTokenAsync(MerchantCredentials merchantCredentials,
        CancellationToken cancellationToken = default);
}