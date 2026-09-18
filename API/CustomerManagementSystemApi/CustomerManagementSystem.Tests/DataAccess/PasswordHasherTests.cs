using CustomerManagementSystem.DataAccess.DBConnection;

namespace CustomerManagementSystem.Tests.DataAccess;

public class PasswordHasherTests
{
    [Fact]
    public void HashPassword_ProducesExpectedHashAndSaltLengths()
    {
        var (hash, salt) = PasswordHasher.HashPassword("Merchant123");

        Assert.Equal(32, hash.Length);
        Assert.Equal(16, salt.Length);
    }

    [Fact]
    public void HashPassword_GeneratesADifferentSaltEveryTime()
    {
        var (_, saltA) = PasswordHasher.HashPassword("Merchant123");
        var (_, saltB) = PasswordHasher.HashPassword("Merchant123");

        Assert.NotEqual(saltA, saltB);
    }

    [Fact]
    public void VerifyPassword_ReturnsTrue_ForTheOriginalPassword()
    {
        var (hash, salt) = PasswordHasher.HashPassword("Merchant123");

        Assert.True(PasswordHasher.VerifyPassword("Merchant123", hash, salt));
    }

    [Fact]
    public void VerifyPassword_ReturnsFalse_ForAWrongPassword()
    {
        var (hash, salt) = PasswordHasher.HashPassword("Merchant123");

        Assert.False(PasswordHasher.VerifyPassword("WrongPassword", hash, salt));
    }

    [Fact]
    public void VerifyPassword_ReturnsFalse_WhenSaltDoesNotMatchTheHash()
    {
        var (hash, _) = PasswordHasher.HashPassword("Merchant123");
        var (_, unrelatedSalt) = PasswordHasher.HashPassword("Merchant123");

        Assert.False(PasswordHasher.VerifyPassword("Merchant123", hash, unrelatedSalt));
    }
}
