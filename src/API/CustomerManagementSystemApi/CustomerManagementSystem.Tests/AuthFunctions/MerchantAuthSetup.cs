using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.AuthFunctions;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.AuthFunctions;

// Stores a merchant whose password is the given one, the way the database would hand it back.
internal static class MerchantAuthSetup
{
    public static void SetupMerchant(this Mock<IDbUtils> dbUtils, string password,
        MerchantRole role = MerchantRole.Merchant)
    {
        var (hash, salt) = PasswordHasher.HashPassword(password);
        dbUtils.Setup(d => d.GetMerchantAuthDataAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MerchantAuthData(hash, salt, role));
    }
}
