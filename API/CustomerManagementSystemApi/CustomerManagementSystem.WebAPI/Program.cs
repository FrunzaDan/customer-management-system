using System.Net;
using System.Threading.RateLimiting;
using CustomerManagementSystem.BusinessLogic;
using CustomerManagementSystem.BusinessLogic.AuthFunctions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using System.Text.Json.Serialization;
using CustomerManagementSystem.Domain.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using CustomerManagementSystem.WebAPI.Routing;
using CustomerManagementSystem.WebAPI.ErrorHandling;
using CustomerManagementSystem.WebAPI.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// Adds the Business Logic Layer
builder.Services.AddBusinessLogic();

// Add services to the container.
// Routes are declared as "api/[controller]"; the transformer turns the PascalCase class name
// into the kebab-case URL segment (CostCenterController -> /api/cost-center). JSON is
// System.Text.Json (the ASP.NET Core default; camelCase, case-insensitive reads) — it handles
// DateOnly, UTC DateTime ("...Z") and Guid natively.
builder.Services.AddControllers(options =>
        options.Conventions.Add(new RouteTokenTransformerConvention(new KebabCaseParameterTransformer())))
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)
    .ConfigureApiBehaviorOptions(options =>
    {
        // With typed request members (Guid, DateOnly, enums), a malformed value now fails in
        // model binding, before the action runs. Reply in the same ResponseModel envelope as
        // every other 400, instead of ASP.NET's default ValidationProblemDetails shape.
        options.InvalidModelStateResponseFactory = context =>
        {
            // A bad JSON body value is reported twice: once under its JSON path ("$.birthDate")
            // and once under the action parameter's name ("request") — name the field.
            var firstError = context.ModelState
                .Where(entry => entry.Value?.Errors.Count > 0)
                .OrderByDescending(entry => entry.Key.StartsWith('$'))
                .Select(entry => $"Invalid value for '{entry.Key.TrimStart('$', '.')}'.")
                .FirstOrDefault() ?? "Invalid request.";

            return new BadRequestObjectResult(new ResponseModel<object>(StatusCodes.Status400BadRequest, firstError));
        };
    });
// OpenAPI document from ASP.NET Core's built-in generator (/openapi/v1.json), shown by Swagger UI.
builder.Services.AddOpenApi(options => options.AddDocumentTransformer<BearerSecuritySchemeTransformer>());

builder.Services.AddHealthChecks();

// The one handler for unexpected exceptions — see ErrorHandling/GlobalExceptionHandler.cs.
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

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

// Throttles POST /api/authentication/access-token so scripted credential-stuffing/brute-force
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
    app.MapOpenApi();
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", "v1"));
}
else
{
    app.UseHsts();
}

// Unhandled exceptions: logged once and answered 500 by GlobalExceptionHandler. The empty
// fallback pipeline is required: a bare UseExceptionHandler() refuses to start unless
// AddProblemDetails() is registered, and this API replies in the ResponseModel envelope, not
// Problem Details. GlobalExceptionHandler always handles the exception, so the fallback never runs.
app.UseExceptionHandler(_ => { });

// Responses carry live, per-user data: never let a browser or proxy cache them.
app.Use(async (context, next) =>
{
    context.Response.Headers.CacheControl = "no-store";
    await next();
});

app.UseCors();

app.UseHttpsRedirection();

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

// Unauthenticated liveness check (no DB probe) for the Angular UI's API-availability banner.
app.MapHealthChecks("/health");

app.MapControllers();

app.Run();