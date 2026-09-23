using System.Net;
using System.Threading.RateLimiting;
using CustomerManagementSystem.BusinessLogic;
using CustomerManagementSystem.BusinessLogic.AuthFunctions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using System.Text.Json.Serialization;
using CustomerManagementSystem.Domain.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// Adds the Business Logic Layer
builder.Services.AddBusinessLogic();

// Add services to the container.
// System.Text.Json (the ASP.NET Core default; camelCase, case-insensitive reads) — it handles
// DateOnly, UTC DateTime ("...Z") and Guid natively.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)
    .ConfigureApiBehaviorOptions(options =>
    {
        // With typed request members (Guid, DateOnly, enums), a malformed value now fails in
        // model binding, before the action runs. Reply in the same ResponseModel envelope as
        // every other 400, instead of ASP.NET's default ValidationProblemDetails shape.
        options.InvalidModelStateResponseFactory = context =>
        {
            // A bad JSON body value is reported twice: once under its JSON path ("$.birthdate")
            // and once under the action parameter's name ("request") — name the field.
            var firstError = context.ModelState
                .Where(entry => entry.Value?.Errors.Count > 0)
                .OrderByDescending(entry => entry.Key.StartsWith('$'))
                .Select(entry => $"Invalid value for '{entry.Key.TrimStart('$', '.')}'.")
                .FirstOrDefault() ?? "Invalid request.";

            return new BadRequestObjectResult(new ResponseModel<object>(StatusCodes.Status400BadRequest, firstError));
        };
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(setup =>
{
    // Include 'SecurityScheme' to use JWT Authentication
    var jwtSecurityScheme = new OpenApiSecurityScheme
    {
        BearerFormat = "JWT",
        Name = "JWT Authentication",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = JwtBearerDefaults.AuthenticationScheme,
        Description = "Put **_ONLY_** your JWT Bearer token on textbox below!"
    };

    setup.AddSecurityDefinition(JwtBearerDefaults.AuthenticationScheme, jwtSecurityScheme);

    setup.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference(JwtBearerDefaults.AuthenticationScheme, document),
            new List<string>()
        }
    });
});

var jwtKey = builder.Configuration["Auth:SecureJWTKey"] ??
             throw new InvalidOperationException("Missing Auth:SecureJWTKey configuration.");
var jwtIssuer = builder.Configuration["Auth:JWTIssuer"] ??
                throw new InvalidOperationException("Missing Auth:JWTIssuer configuration.");
var jwtAudience = builder.Configuration["Auth:JWTAudience"] ??
                  throw new InvalidOperationException("Missing Auth:JWTAudience configuration.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = JwtSigningKey.Create(jwtKey),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .WithOrigins(allowedOrigins)
        .WithMethods("GET", "POST", "PATCH", "DELETE")
        .WithHeaders("Content-Type", "Authorization"));
});

// Throttles POST /api/Authentication/access-token so scripted credential-stuffing/brute-force
// can't run at network speed; PBKDF2 alone (see PasswordHasher) only slows a single guess.
// Per-IP fixed window, in-memory — resets on app restart, doesn't survive multiple instances,
// which is fine for this app's single-instance local/demo scope.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("login", httpContext => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        }));

    options.OnRejected = async (context, cancellationToken) =>
    {
        await context.HttpContext.Response.WriteAsJsonAsync(
            new ResponseModel<object>(StatusCodes.Status429TooManyRequests,
                "Too many login attempts. Please wait a moment and try again."), cancellationToken);
    };
});

builder.Services.AddHttpsRedirection(options =>
{
    options.RedirectStatusCode = (int)HttpStatusCode.TemporaryRedirect;
    options.HttpsPort = 5001;
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;

        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>()
            .CreateLogger("GlobalExceptionHandler");
        if (exception is not null)
            logger.LogError(exception, "Unhandled exception while processing {Path}", context.Request.Path);

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;

        var message = app.Environment.IsDevelopment() && exception is not null
            ? $"An error occurred while processing your request: {exception.Message}"
            : "An error occurred while processing your request.";

        await context.Response.WriteAsJsonAsync(
            new ResponseModel<object>(StatusCodes.Status500InternalServerError, message));
    });
});

app.UseCors();

app.UseHttpsRedirection();

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

// Unauthenticated liveness check for the Angular UI's API-availability banner.
app.MapGet("/health", () => Results.Ok());

app.MapControllers();

app.Run();