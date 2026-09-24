using System.Globalization;
using System.Security.Claims;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Configuration;
using CustomerManagementSystem.Domain.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace CustomerManagementSystem.BusinessLogic.AuthFunctions;

public class JwtCreation
{
    private readonly IAppSettingsConfig _configuration;
    private readonly IDbUtils _dbUtils;
    private readonly SymmetricSecurityKey _signingKey;

    public JwtCreation(IAppSettingsConfig appSettingsConfig, IDbUtils dbUtils)
    {
        _dbUtils = dbUtils;
        _configuration = appSettingsConfig;
        _signingKey = JwtSigningKey.Create(_configuration.SecureJwtKey);
    }

    public async Task<ResponseModel<AccessTokenResponse>> GenerateBearerJwt(MerchantCredentials merchantCredentials,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(merchantCredentials.Username))
            return new ResponseModel<AccessTokenResponse>(400, "Username and password are required.");

        var credentialsCheck = await _dbUtils.CheckMerchantCredentialsFromDb(merchantCredentials, cancellationToken);

        // 401 (wrong username or password) or 403 (a role that may not sign in), with its message.
        if (credentialsCheck.Status != StatusCodes.Status200OK)
            return new ResponseModel<AccessTokenResponse>(credentialsCheck.Status, credentialsCheck.ResponseMessage);

        // A bad AccessTokenTimeout is a server misconfiguration, not something the caller did: it
        // throws, and GlobalExceptionHandler logs it and answers 500 (checked before any signing
        // work, since BuildTokenDescriptor would otherwise need the value).
        if (!double.TryParse(_configuration.AccessTokenTimeout, out var timeoutMinutes))
            throw new InvalidOperationException("Invalid Auth:AccessTokenTimeout configuration.");

        // One timestamp for both the token's exp claim and the ExpiresAt reported to the
        // client, so the two can't drift apart.
        var expires = DateTime.UtcNow.AddMinutes(timeoutMinutes);
        var token = GenerateJwtToken(merchantCredentials.Username, credentialsCheck.Data, expires);

        return new ResponseModel<AccessTokenResponse>(StatusCodes.Status200OK, "Success!",
            new AccessTokenResponse { AccessToken = token, ExpiresAt = expires });
    }

    private string GenerateJwtToken(string username, MerchantRole? merchantRole, DateTime expires)
    {
        var tokenDescriptor = BuildTokenDescriptor(username, merchantRole, expires);
        // JsonWebTokenHandler is the current IdentityModel handler (the one JwtBearer validates
        // with); it writes claim types as given, so the claims below use the short JWT names.
        return new JsonWebTokenHandler().CreateToken(tokenDescriptor);
    }

    private SecurityTokenDescriptor BuildTokenDescriptor(string username, MerchantRole? merchantRole, DateTime expires)
    {
        return new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity([
                new Claim(JwtRegisteredClaimNames.Sub, username),
                // unique_name/role are mapped back to ClaimTypes.Name/Role when JwtBearer reads the token.
                new Claim(JwtRegisteredClaimNames.UniqueName, username),
                // The role claim is the numeric code ("1801"), which is what [Authorize(Roles = "1801")]
                // checks — not the enum member's name.
                new Claim("role",
                    merchantRole is { } role ? ((short)role).ToString(CultureInfo.InvariantCulture) : string.Empty),
                new Claim(JwtRegisteredClaimNames.Amr, "pwd"),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            ]),
            // iat is set here rather than as a hand-built claim: RFC 7519 requires a NumericDate
            // (seconds since the Unix epoch), which the token handler writes from IssuedAt.
            IssuedAt = DateTime.UtcNow,
            Expires = expires,
            SigningCredentials = new SigningCredentials(_signingKey, SecurityAlgorithms.HmacSha256Signature),
            Issuer = _configuration.JwtIssuer,
            Audience = _configuration.JwtAudience
        };
    }
}