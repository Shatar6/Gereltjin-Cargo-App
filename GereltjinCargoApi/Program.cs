using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using GereltjinCargoApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Checks the current version is under development. If so, loads local secrets into builder.Configuration
if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddUserSecrets<Program>();
}

// Add services
builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer(); // Allows ASP.NET Core to discover your API endpoints.

builder.Services.AddSwaggerGen();           // Adds Swagger generator to your project. Swagger is a tool to generate interactive API documentation.
                                            // Reads your API endpoints and models, Creates a JSON OpenAPI specification for the API, 
                                            // Prepares Swagger UI so you can test endpoints in the browser


// Register SupabaseService
builder.Services.AddSingleton<SupabaseService>();

// Get JWT key with null check
var jwtKey = builder.Configuration["Supabase:JwtSecret"];
if (string.IsNullOrEmpty(jwtKey))
{
    throw new InvalidOperationException("JWT Key is not configured. Please set it in user secrets or environment variables.");
}

// Configure JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "CargoAPI",
            ValidAudience = "CargoApp",
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Supabase:JwtSecret"]))
        };
    });

// Add CORS for React Native
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder =>
        {
            builder.AllowAnyOrigin()
                   .AllowAnyMethod()
                   .AllowAnyHeader();
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

