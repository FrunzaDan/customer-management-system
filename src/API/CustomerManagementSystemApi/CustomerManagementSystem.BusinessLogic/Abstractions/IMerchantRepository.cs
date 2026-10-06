using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Abstractions;

/// <summary>A merchant's stored login data; the password check itself happens in BusinessLogic.</summary>
public sealed record MerchantAuthData(byte[] PasswordHash, byte[] PasswordSalt, MerchantRole MerchantRole);

/// <summary>Merchant login data. Implemented by DataAccess (stored procedures).</summary>
public interface IMerchantRepository
{
    Task<MerchantAuthData?> GetMerchantAuthDataAsync(string username, CancellationToken cancellationToken = default);
    Task RecordMerchantLoginAsync(string username, CancellationToken cancellationToken = default);
}
