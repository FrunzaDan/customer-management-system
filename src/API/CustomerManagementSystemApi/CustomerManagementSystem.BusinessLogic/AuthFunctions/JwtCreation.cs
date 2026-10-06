using System.Globalization;
using System.Security.Claims;
using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Configuration;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace CustomerManagementSystem.BusinessLogic.AuthFunctions;

public class JwtCreation
{
    // Verified against when the username is unknown, so a miss takes as long as a wrong password.
    private static readonly byte[] UnknownUserHash = new byte[32];
    private static readonly byte[] UnknownUserSalt = new byte[16];

    private readonly AuthOptions _authOptions;
    private readonly IDbUtils _dbUtils;
    private readonly SymmetricSecurityKey _signingKey;

    public JwtCreation(IOptions<AuthOptions> authOptions, IDbUtils dbUtils)
    {
        _dbUtils = dbUtils;
        _authOptions = authOptions.Value;
        _signingKey = JwtSigningKey.Create(_authOptions.SecureJwtKey);
    }

    public async Task<ResponseModel<AccessTokenResponse>> GenerateBearerJwtAsync(MerchantCredentials merchantCredentials,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(merchantCredentials.Username))
            return new ResponseModel<AccessTokenResponse>(400, "Username and password are required.");

        var credentialsCheck = await CheckCredentialsAsync(merchantCredentials.Username,
            merchantCredentials.Password, cancellationToken);

        if (credentialsCheck.Status != 200)
            return new ResponseModel<AccessTokenResponse>(credentialsCheck.Status, credentialsCheck.ResponseMessage);

        var expires = DateTime.UtcNow.AddMinutes(_authOptions.AccessTokenTimeoutMinutes);
        var token = GenerateJwtToken(merchantCredentials.Username, credentialsCheck.Data, expires);

        return new ResponseModel<AccessTokenResponse>(200, "Success!",
            new AccessTokenResponse { AccessToken = token, ExpiresAt = expires });
    }

    private async Task<ResponseModel<MerchantRole?>> CheckCredentialsAsync(string username, string? password,
        CancellationToken cancellationToken)
    {
        var authData = await _dbUtils.GetMerchantAuthDataAsync(username, cancellationToken);

        var passwordMatches = PasswordHasher.VerifyPassword(password ?? string.Empty,
            authData?.PasswordHash ?? UnknownUserHash, authData?.PasswordSalt ?? UnknownUserSalt);

        if (authData is null || !passwordMatches)
            return new ResponseModel<MerchantRole?>(401, "Invalid username or password.");

        var roleCode = (short)authData.MerchantRole;
        if (authData.MerchantRole != MerchantRole.Merchant)
            return new ResponseModel<MerchantRole?>(403, $"The provided merchant role ({roleCode}) is not valid.");

        await _dbUtils.RecordMerchantLoginAsync(username, cancellationToken);

        return new ResponseModel<MerchantRole?>(200, $"Credentials validated successfully. Role: {roleCode}.",
            authData.MerchantRole);
    }

    private string GenerateJwtToken(string username, MerchantRole? merchantRole, DateTime expires)
    {
        var tokenDescriptor = BuildTokenDescriptor(username, merchantRole, expires);
        return new JsonWebTokenHandler().CreateToken(tokenDescriptor);
    }

    private SecurityTokenDescriptor BuildTokenDescriptor(string username, MerchantRole? merchantRole, DateTime expires)
    {
        return new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity([
                new Claim(JwtRegisteredClaimNames.Sub, username),
                new Claim(JwtRegisteredClaimNames.UniqueName, username),
                new Claim("role",
                    merchantRole is { } role ? ((short)role).ToString(CultureInfo.InvariantCulture) : string.Empty),
                new Claim(JwtRegisteredClaimNames.Amr, "pwd"),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            ]),
            IssuedAt = DateTime.UtcNow,
            Expires = expires,
            SigningCredentials = new SigningCredentials(_signingKey, SecurityAlgorithms.HmacSha256Signature),
            Issuer = _authOptions.JwtIssuer,
            Audience = _authOptions.JwtAudience
        };
    }
}
