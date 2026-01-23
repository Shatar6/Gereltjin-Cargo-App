using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BCrypt.Net;
using Dapper;
using GereltjinCargoApi.Services;
using GereltjinCargoApi.Models;

namespace GereltjinCargoApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly SupabaseService _supabaseService;
        private readonly IConfiguration _configuration;

        public AuthController(SupabaseService supabaseService, IConfiguration configuration)
        {
            _supabaseService = supabaseService;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            using var connection = _supabaseService.GetConnection();
            
            var worker = await connection.QuerySingleOrDefaultAsync<dynamic>(
                "SELECT id, email, password_hash, name, role FROM workers WHERE email = @Email",
                new { request.Email }
            );
            
            Console.WriteLine($"Worker Role Retrieved: {worker}");

            if (worker == null || !BCrypt.Net.BCrypt.Verify(request.Password, worker.password_hash))
                return Unauthorized(new { message = "Invalid credentials" });
            
            var token = GenerateJwtToken((Guid)worker.id, worker.email, worker.role);
            
            return Ok(new LoginResponse 
            { 
                Token = token, 
                Email = worker.email, 
                UserId = worker.id,
                Name = worker.name
            });
        }

        private string GenerateJwtToken(Guid userId, string email, string role)
        {
            // Use Supabase:JwtSecret from your secrets
            var jwtSecret = _configuration["Supabase:JwtSecret"] 
                ?? throw new InvalidOperationException("Supabase JWT Secret not configured");
            
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Role, role),
                new Claim(ClaimTypes.Email, email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"] ?? "CargoAPI",
                audience: _configuration["Jwt:Audience"] ?? "CargoApp",
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(Convert.ToDouble(_configuration["Jwt:ExpiryInMinutes"] ?? "1440")),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}