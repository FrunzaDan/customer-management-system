using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Configuration;
using CustomerManagementSystem.Domain.Models;
using Microsoft.AspNetCore.Http;
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
        if (string.IsNullOrWhiteSpace(merchantCredentials.MerchantId))
            return new ResponseModel<AccessTokenResponse>(403, "Invalid or empty merchant ID.");

        try
        {
            // Validate merchant credentials
            var credentialsCheck = await _dbUtils.CheckMerchantCredentialsFromDb(merchantCredentials, cancellationToken);

            if (credentialsCheck.Status != 200)
                return new ResponseModel<AccessTokenResponse>(403, credentialsCheck.ResponseMessage);

            // Validate config before doing any signing work: BuildTokenDescriptor() would
            // otherwise call double.Parse(AccessTokenTimeout) directly and throw on a bad
            // value, making this check unreachable and wasting a signed token in the process.
            if (!double.TryParse(_configuration.AccessTokenTimeout, out var timeoutMinutes))
                return new ResponseModel<AccessTokenResponse>(500, "Invalid AccessTokenTimeout configuration.");

            // One timestamp for both the token's exp claim and the ValidUntil reported to the
            // client, so the two can't drift apart.
            var expires = DateTime.UtcNow.AddMinutes(timeoutMinutes);
            var token = GenerateJwtToken(merchantCredentials.MerchantId, credentialsCheck.Data, expires);

            return new ResponseModel<AccessTokenResponse>(StatusCodes.Status200OK, "Success!",
                new AccessTokenResponse { AccessToken = token, ValidUntil = expires });
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception)
        {
            // Unlike the rest of the app, this endpoint is unauthenticated, and any exception
            // here is caught locally rather than bubbling to the global exception handler (whose
            // Details-only-in-Development guard wouldn't apply to this method's own response
            // anyway) — so ex.Message must never be echoed back to an anonymous caller.
            return new ResponseModel<AccessTokenResponse>(500, "An error occurred while generating the access token.");
        }
    }

    private string GenerateJwtToken(string merchantId, MerchantRole? merchantRole, DateTime expires)
    {
        var tokenDescriptor = BuildTokenDescriptor(merchantId, merchantRole, expires);
        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private SecurityTokenDescriptor BuildTokenDescriptor(string merchantId, MerchantRole? merchantRole, DateTime expires)
    {
        return new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity([
                new Claim(ClaimTypes.Sid, merchantId),
                new Claim(JwtRegisteredClaimNames.Sub, merchantId),
                new Claim(ClaimTypes.Name, merchantId),
                // The role claim is the numeric code ("1801"), which is what [Authorize(Roles = "1801")]
                // checks — not the enum member's name.
                new Claim(ClaimTypes.Role,
                    merchantRole is { } role ? ((short)role).ToString(CultureInfo.InvariantCulture) : string.Empty),
                new Claim("amr", "pwd"),
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