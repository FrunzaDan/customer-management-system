using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace CustomerManagementSystem.BusinessLogic.AuthFunctions;

public static class JwtSigningKey
{
    // Issuing (JwtCreation) and validation (Program.cs's JwtBearer setup) must derive the
    // signing key from Auth:SecureJWTKey identically, or tokens silently fail validation with
    // no compile-time warning — hence one shared implementation instead of two independent ones.
    public static SymmetricSecurityKey Create(string secureJwtKey) =>
        new(Encoding.ASCII.GetBytes(secureJwtKey));
}
