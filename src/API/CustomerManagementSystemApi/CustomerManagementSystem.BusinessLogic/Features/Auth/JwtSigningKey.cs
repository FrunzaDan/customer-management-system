using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace CustomerManagementSystem.BusinessLogic.Features.Auth;

public static class JwtSigningKey
{
    public static SymmetricSecurityKey Create(string secureJwtKey) =>
        new(Encoding.UTF8.GetBytes(secureJwtKey));
}
