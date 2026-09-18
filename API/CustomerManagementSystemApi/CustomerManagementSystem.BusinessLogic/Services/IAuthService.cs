using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Services;

public interface IAuthService
{
    Task<ResponseModel<object>> GetAccessToken(MerchantCredentials merchantCredentials,
        CancellationToken cancellationToken = default);
}