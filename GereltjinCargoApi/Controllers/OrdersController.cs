using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Dapper;
using GereltjinCargoApi.Models;
using GereltjinCargoApi.Services;

namespace GereltjinCargoApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly SupabaseService _supabaseService;
        private readonly IConfiguration _configuration;
        
        public OrdersController(SupabaseService supabaseService, IConfiguration configuration)
        {
            _supabaseService = supabaseService;
            _configuration = configuration;
        }

        // Get next order number for current worker
        [HttpGet("next-order-number")]
        public async Task<IActionResult> GetNextOrderNumber()
        {
            using var connection = _supabaseService.GetConnection();
            
            // Get current user info
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var worker = await connection.QuerySingleOrDefaultAsync<dynamic>(
                "SELECT name FROM workers WHERE id = @Id",
                new { Id = Guid.Parse(userId!) }
            );

            if (worker == null)
                return BadRequest(new { message = "Worker not found" });

            // Generate initials (first 2 letters of name)
            string name = worker.name ?? "XX";
            string initials = name.Length >= 2 
                ? name.Substring(0, 2).ToUpper() 
                : name.ToUpper().PadRight(2, 'X');

            // Get today's date
            var today = DateTime.Now;
            var dateStr = today.ToString("yy-MM-dd");

            // Get count of today's orders for this worker
            var startOfDay = today.Date;
            var endOfDay = today.Date.AddDays(1);
            
            var todayCount = await connection.QuerySingleAsync<int>(
                @"SELECT COUNT(*) FROM orders 
                  WHERE worker_id = @WorkerId 
                  AND created_at >= @StartOfDay 
                  AND created_at < @EndOfDay",
                new { 
                    WorkerId = Guid.Parse(userId!), 
                    StartOfDay = startOfDay, 
                    EndOfDay = endOfDay 
                }
            );

            // Generate order number: JO-26-01-02-003
            var orderNumber = $"{initials}-{dateStr}-{(todayCount + 1):D3}";

            return Ok(new { orderNumber });
        }
        
        [HttpGet]
        public async Task<IActionResult> GetOrders([FromQuery] string? search = null)
        {
            using var connection = _supabaseService.GetConnection();
            
            var query = @"
                SELECT o.*, w.name as worker_name
                FROM orders o
                LEFT JOIN workers w ON o.worker_id = w.id
                WHERE (@Search IS NULL OR 
                       o.order_number ILIKE @SearchPattern OR 
                       o.customer_name ILIKE @SearchPattern)
                ORDER BY o.created_at DESC";
            
            var searchPattern = $"%{search}%";
            var orders = await connection.QueryAsync<Order>(query, 
                new { Search = search, SearchPattern = searchPattern });
            
            return Ok(orders);
        }
        
        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrder(Guid id)
        {
            using var connection = _supabaseService.GetConnection();
            
            var order = await connection.QuerySingleOrDefaultAsync<Order>(
                "SELECT * FROM orders WHERE id = @Id", 
                new { Id = id });
            
            if (order == null)
                return NotFound();
            
            return Ok(order);
        }
        
        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
        {
            using var connection = _supabaseService.GetConnection();
            
            // Get current user ID and info
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var worker = await connection.QuerySingleOrDefaultAsync<dynamic>(
                "SELECT name FROM workers WHERE id = @Id",
                new { Id = Guid.Parse(userId!) }
            );

            // Generate order number
            string name = worker?.name ?? "XX";
            string initials = name.Length >= 2 
                ? name.Substring(0, 2).ToUpper() 
                : name.ToUpper().PadRight(2, 'X');

            var today = DateTime.Now;
            var dateStr = today.ToString("yy-MM-dd");
            
            // Get today's count for this worker
            var startOfDay = today.Date;
            var endOfDay = today.Date.AddDays(1);
            
            var todayCount = await connection.QuerySingleAsync<int>(
                @"SELECT COUNT(*) FROM orders 
                  WHERE worker_id = @WorkerId 
                  AND created_at >= @StartOfDay 
                  AND created_at < @EndOfDay",
                new { 
                    WorkerId = Guid.Parse(userId!), 
                    StartOfDay = startOfDay, 
                    EndOfDay = endOfDay 
                }
            );

            var orderNumber = $"{initials}-{dateStr}-{(todayCount + 1):D3}";

            // Handle photo upload if present
            string? photoUrl = null;
            if (!string.IsNullOrEmpty(request.PhotoBase64))
            {
                // For now, store as base64 in database
                // In production, upload to cloud storage (Azure Blob, AWS S3, etc.)
                photoUrl = request.PhotoBase64;
            }

            var order = new Order
            {
                id = Guid.NewGuid(),
                order_number = orderNumber,
                customer_name = request.CustomerName,
                customer_phone = request.CustomerPhone,
                pickup_address = request.PickupAddress,
                cargo_type = request.CargoType,
                weight = request.Weight,
                status = "pending",
                worker_id = Guid.Parse(userId!),
                notes = request.Notes,
                photo_url = photoUrl,
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow
            };

            await connection.ExecuteAsync(@"
                INSERT INTO orders (
                    id, order_number, customer_name, customer_phone,
                    pickup_address, cargo_type,
                    weight, status, worker_id, notes, photo_url,
                    created_at, updated_at
                ) VALUES (
                    @id, @order_number, @customer_name, @customer_phone,
                    @pickup_address,  @cargo_type,
                    @weight, @status, @worker_id, @notes, @photo_url,
                    @created_at, @updated_at
                )", order);
            
            return Ok(order);
        }
        
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] StatusUpdateRequest request)
        {
            using var connection = _supabaseService.GetConnection();
            
            await connection.ExecuteAsync(
                "UPDATE orders SET status = @Status, updated_at = @UpdatedAt WHERE id = @Id",
                new { Id = id, request.Status, UpdatedAt = DateTime.UtcNow });
            
            return Ok(new { message = "Status updated successfully" });
        }

        [HttpPost("upload-photo")]
        public async Task<IActionResult> UploadPhoto([FromBody] PhotoUploadRequest request)
        {
            if (string.IsNullOrEmpty(request.PhotoBase64))
                return BadRequest(new { message = "No photo provided" });

            // In production, upload to cloud storage and return URL
            // For now, just return success
            return Ok(new { photoUrl = request.PhotoBase64 });
        }
    }
    
    public class CreateOrderRequest
    {
        public string CustomerName { get; set; } = string.Empty;
        public string? CustomerPhone { get; set; }
        public string PickupAddress { get; set; } = string.Empty;
        public string DeliveryAddress { get; set; } = string.Empty;
        public string? CargoType { get; set; }
        public decimal? Weight { get; set; }
        public string? Notes { get; set; }
        public string? PhotoBase64 { get; set; }
    }

    public class StatusUpdateRequest
    {
        public string Status { get; set; } = string.Empty;
    }

    public class PhotoUploadRequest
    {
        public string PhotoBase64 { get; set; } = string.Empty;
    }
}