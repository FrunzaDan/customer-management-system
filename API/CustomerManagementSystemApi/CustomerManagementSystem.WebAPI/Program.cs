using System.Globalization;
using System.Threading.RateLimiting;
using CustomerManagementSystem.BusinessLogic;
using CustomerManagementSystem.BusinessLogic.AuthFunctions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
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
    options.Conventions.Add(new RouteTokenTransformerConvention(new KebabCaseParameterTransformer())));
// OpenAPI document from ASP.NET Core's built-in generator (/openapi/v1.json), shown by Swagger UI.
builder.Services.AddOpenApi(options => options.AddDocumentTransformer<BearerSecuritySchemeTransformer>());

builder.Services.AddHealthChecks();

// Every error response is RFC 9457 Problem Details (application/problem+json): validation
// failures from [ApiController] (a malformed Guid/DateOnly/enum is rejected in model binding,
// before the action runs), failed ResponseModel results (ApiControllerBase.Reply), bare status
// codes such as 401/403 from the JWT bearer handler (UseStatusCodePages), the login rate limit
// (OnRejected below) and unhandled exceptions (GlobalExceptionHandler, which logs them once and
// answers 500).
builder.Services.AddProblemDetails();
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

    options.OnRejected = async (context, _) =>
    {
        // Retry-After tells the client when the window resets (RFC 9110 §10.2.3).
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            context.HttpContext.Response.Headers.RetryAfter =
                ((int)retryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);

        await context.HttpContext.RequestServices.GetRequiredService<IProblemDetailsService>().WriteAsync(
            new ProblemDetailsContext
            {
                HttpContext = context.HttpContext,
                ProblemDetails = new ProblemDetails
                {
                    Status = StatusCodes.Status429TooManyRequests,
                    Detail = "Too many login attempts. Please wait a moment and try again."
                }
            });
    };
});

var app = builder.Build();

// Configure the HTTP request pipeline.
// First, so it catches exceptions from everything after it.
app.UseExceptionHandler();
// Gives an empty 4xx/5xx (unknown route, wrong method, 401/403 from the JWT bearer handler) a
// Problem Details body.
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", "v1"));
}
else
{
    app.UseHsts();
}

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