using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Dapper;
using GereltjinCargoApi.Models;
using GereltjinCargoApi.Services;
using System.Text.Json;

namespace GereltjinCargoApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly SupabaseService _supabaseService;
        private readonly SupabaseStorageService _storageService;
        private readonly IConfiguration _configuration;
        
        public OrdersController(SupabaseService supabaseService, SupabaseStorageService storageService, IConfiguration configuration)
        {
            _supabaseService = supabaseService;
            _storageService = storageService;
            _configuration = configuration;
        }

        // Get next order number for current worker
        [HttpGet("next-order-number")]
        public async Task<IActionResult> GetNextOrderNumber()
        {
            using var connection = _supabaseService.GetConnection();
            // Get current user info
            var (userId, _, _) = GetCurrentUser();
            var worker = await connection.QuerySingleOrDefaultAsync<dynamic>(
                "SELECT name, worker_code  FROM workers WHERE id = @Id",
                new { Id = userId }
            );

            if (worker == null)
                return BadRequest(new { message = "Worker not found" });
            
            Console.WriteLine($"Worker Code: {worker}");

            string workerCode = worker.worker_code; // e.g., "HS12"

            // // Generate initials (first 2 letters of name)
            // string name = worker.name ?? "XX";
            // string initials = name.Length >= 2 
            //     ? name.Substring(0, 2).ToUpper() 
            //     : name.ToUpper().PadRight(2, 'X');

            // var koreaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Korea Standard Time");
            // var todayKst = TimeZoneInfo.ConvertTime(DateTime.UtcNow, koreaTimeZone).Date;

            // // Get today's date
            // var today = todayKst;
            // var dateStr = today.ToString("yy-MM-dd");

            // // Get count of today's orders for this worker
            // var startOfDay = today.Date;
            // var endOfDay = today.Date.AddDays(1);
            
            
            // var todayCount = await connection.QuerySingleAsync<int>(
            //     @"SELECT COUNT(*) FROM orders 
            //       WHERE worker_id = @WorkerId 
            //       AND created_at >= @StartOfDay 
            //       AND created_at < @EndOfDay",
            //     new { 
            //         WorkerId = userId, 
            //         StartOfDay = startOfDay, 
            //         EndOfDay = endOfDay 
            //     }
            // );

            // Generate order number: JO-26-01-02-003
            // var orderNumber = $"{initials}-{dateStr}-{(todayCount + 1):D3}";


            // Extract the letter prefix and starting number
            string prefix = new string(workerCode.Where(char.IsLetter).ToArray()); // "HS"
            string numberPart = new string(workerCode.Where(char.IsDigit).ToArray()); // "12"
            
            if (!int.TryParse(numberPart, out int startingNumber))
            {
                return BadRequest(new { message = "Invalid worker code format. Expected format: XX##" });
            }

            // Get the last order number for this worker
            var lastOrder = await connection.QuerySingleOrDefaultAsync<string>(
                @"SELECT order_number FROM orders 
                WHERE worker_id = @WorkerId 
                AND order_number LIKE @CodePattern
                ORDER BY created_at DESC 
                LIMIT 1",
                new { 
                    WorkerId = userId,
                    CodePattern = $"{prefix}%"
                }
            );

            int nextNumber;
            if (lastOrder != null)
            {
                // Extract number from last order (e.g., "HS13" -> "13")
                string lastNumberStr = new string(lastOrder.Where(char.IsDigit).ToArray());
                
                if (int.TryParse(lastNumberStr, out int lastNumber))
                {
                    nextNumber = lastNumber + 1; // HS13 → HS14
                }
                else
                {
                    // Fallback to starting number if parsing fails
                    nextNumber = startingNumber;
                }
            }
            else
            {
                // First order for this worker, use their starting number
                nextNumber = startingNumber;
            }

            // Generate order number with same digit count as worker code
            int digitCount = numberPart.Length;
            string formatString = new string('0', digitCount); // "00" for 2 digits
            var orderNumber = $"{prefix}{nextNumber.ToString(formatString)}";

            return Ok(new { orderNumber });
        }
        
        [HttpGet]
        public async Task<IActionResult> GetOrders([FromQuery] string? search = null)
        {
            using var connection = _supabaseService.GetConnection();

            var (userId, userRole, _) = GetCurrentUser();

            string query;
            object parameters;

            if (userRole == "executive")
            {
                // Executives see all orders
                query = @"
                    SELECT o.*, w.name as worker_name
                    FROM orders o
                    LEFT JOIN workers w ON o.worker_id = w.id
                    WHERE (@Search IS NULL OR 
                           o.order_number ILIKE @SearchPattern OR 
                           o.customer_name ILIKE @SearchPattern OR
                           o.receiver_name ILIKE @SearchPattern)
                    ORDER BY o.created_at DESC";
                
                var searchPattern = $"%{search}%";
                parameters = new { Search = search, SearchPattern = searchPattern };
            }
            else
            {
                // Workers see only their orders
                query = @"
                    SELECT o.*, w.name as worker_name
                    FROM orders o
                    LEFT JOIN workers w ON o.worker_id = w.id
                    WHERE o.worker_id = @WorkerId
                    AND (@Search IS NULL OR 
                         o.order_number ILIKE @SearchPattern OR 
                         o.customer_name ILIKE @SearchPattern OR
                         o.receiver_name ILIKE @SearchPattern)
                    ORDER BY o.created_at DESC";
                
                var searchPattern = $"%{search}%";
                parameters = new { WorkerId = userId, Search = search, SearchPattern = searchPattern };
            }
            
            var orders = await connection.QueryAsync<Order>(query, parameters);
            
            
            // var query = @"
            //     SELECT o.*, w.name as worker_name
            //     FROM orders o
            //     LEFT JOIN workers w ON o.worker_id = w.id
            //     WHERE (@Search IS NULL OR 
            //            o.order_number ILIKE @SearchPattern OR 
            //            o.customer_name ILIKE @SearchPattern)
            //     ORDER BY o.created_at DESC";
            
            // var searchPattern = $"%{search}%";
            // var orders = await connection.QueryAsync<Order>(query, 
            //     new { Search = search, SearchPattern = searchPattern });
            
            return Ok(orders);
        }
        
        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrder(Guid id)
        {
            using var connection = _supabaseService.GetConnection();

            var (userId, userRole, _) = GetCurrentUser();
            
            var order = await connection.QuerySingleOrDefaultAsync<Order>(
                "SELECT * FROM orders WHERE id = @Id", 
                new { Id = id });
            
            if (order == null)
                return NotFound();

            if (userRole != "executive" && order.worker_id != userId)
            {
                return Forbid();
            }
            
            return Ok(order);
        }

        [HttpGet("{id}/history")]
        public async Task<IActionResult> GetOrderHistory(Guid id)
        {
            using var connection = _supabaseService.GetConnection();
            
            var (userId, userRole, _) = GetCurrentUser();
            
            // Check if order exists and user has permission
            var order = await connection.QuerySingleOrDefaultAsync<Order>(
                "SELECT * FROM orders WHERE id = @Id", 
                new { Id = id });
            
            if (order == null)
                return NotFound();

            // Authorization check
            if (userRole != "executive" && order.worker_id != userId)
            {
                return Forbid();
            }

            var history = await connection.QueryAsync<OrderHistory>(
                @"SELECT * FROM order_history 
                  WHERE order_id = @OrderId 
                  ORDER BY created_at DESC",
                new { OrderId = id });

            return Ok(history);
        }
        
        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
        {
            using var connection = _supabaseService.GetConnection();

            var (userId, userRole, _) = GetCurrentUser();
            
            // Get current user ID and info
            //var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var worker = await connection.QuerySingleOrDefaultAsync<dynamic>(
                "SELECT name, worker_code FROM workers WHERE id = @Id",
                new { Id = userId}
            );



            // Generate order number
            // string name = worker?.name ?? "XX";
            // string initials = name.Length >= 2 
            //     ? name.Substring(0, 2).ToUpper() 
            //     : name.ToUpper().PadRight(2, 'X');

            // var today = DateTime.Now;
            // var dateStr = today.ToString("yy-MM-dd");
            
            // // Get today's count for this worker
            // var startOfDay = today.Date;
            // var endOfDay = today.Date.AddDays(1);
            
            // var todayCount = await connection.QuerySingleAsync<int>(
            //     @"SELECT COUNT(*) FROM orders 
            //       WHERE worker_id = @WorkerId 
            //       AND created_at >= @StartOfDay 
            //       AND created_at < @EndOfDay",
            //     new { 
            //         WorkerId = userId, 
            //         StartOfDay = startOfDay, 
            //         EndOfDay = endOfDay 
            //     }
            // );

            // var orderNumber = $"{initials}-{dateStr}-{(todayCount + 1):D3}";
            // var orderNumber = request.OrderNumber;
            string workerCode = worker.worker_code;

    
            // Extract prefix and number
            string prefix = new string(workerCode.Where(char.IsLetter).ToArray());
            string numberPart = new string(workerCode.Where(char.IsDigit).ToArray());
            
            if (!int.TryParse(numberPart, out int startingNumber))
            {
                return BadRequest(new { message = "Invalid worker code format" });
            }

            // Get last order and calculate next number
            var lastOrder = await connection.QuerySingleOrDefaultAsync<string>(
                @"SELECT order_number FROM orders 
                WHERE worker_id = @WorkerId 
                AND order_number LIKE @CodePattern
                ORDER BY created_at DESC 
                LIMIT 1",
                new { 
                    WorkerId = userId,
                    CodePattern = $"{prefix}%"
                }
            );

            int nextNumber;
            if (lastOrder != null)
            {
                string lastNumberStr = new string(lastOrder.Where(char.IsDigit).ToArray());
                nextNumber = int.TryParse(lastNumberStr, out int lastNumber) ? lastNumber + 1 : startingNumber;
            }
            else
            {
                nextNumber = startingNumber;
            }

            // Format with same digit count
            int digitCount = numberPart.Length;
            string formatString = new string('0', digitCount);
            var orderNumber = $"{prefix}{nextNumber.ToString(formatString)}";

            string? photoUrl = null;
            if (!string.IsNullOrEmpty(request.PhotoBase64))
            {
                try
                {
                    // Upload to Supabase Storage via backend
                    photoUrl = await _storageService.UploadImageAsync(request.PhotoBase64, orderNumber);
                    Console.WriteLine($"Photo uploaded successfully: {photoUrl}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Photo upload failed: {ex.Message}");
                    // Continue without photo - don't fail the entire order creation
                    photoUrl = null;
                }
            }

            var order = new Order
            {
                id = Guid.NewGuid(),
                order_number = orderNumber,
                customer_name = request.CustomerName,
                customer_phone = request.CustomerPhone,
                //pickup_address = request.PickupAddress,
                cargo_type = request.CargoType,
                weight = request.Weight,
                price = request.Price,
                receiver_name = request.ReceiverName,
                receiver_phone = request.ReceiverPhone,
                status = "received_package",
                worker_id = userId,
                notes = request.Notes,
                photo_url = photoUrl,
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow
            };

            await connection.ExecuteAsync(@"
                INSERT INTO orders (
                    id, order_number, customer_name, customer_phone, cargo_type, weight, price, 
                    receiver_name, receiver_phone,
                     status, worker_id, notes, photo_url,
                    created_at, updated_at
                ) VALUES (
                    @id, @order_number, @customer_name, @customer_phone,
                     @cargo_type, @weight, @price, 
                    @receiver_name, @receiver_phone,
                     @status, @worker_id, @notes, @photo_url,
                    @created_at, @updated_at
                )", order);

            await LogOrderHistory(order.id, "created", newStatus: "received_package");
            
            return Ok(order);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateOrder(Guid id, [FromBody] UpdateOrderRequest request)
        {
            using var connection = _supabaseService.GetConnection();
            
            var (userId, userRole, _) = GetCurrentUser();
            
            var order = await connection.QuerySingleOrDefaultAsync<Order>(
                "SELECT * FROM orders WHERE id = @Id",
                new { Id = id });
            
            if (order == null)
                return NotFound();

            // Authorization: Only executives or assigned worker can update
            if (userRole != "executive" && order.worker_id != userId)
            {
                return Forbid();
            }

            var changes = new Dictionary<string, object>();
            var oldStatus = order.status;

            // Status update with authorization check
            if (!string.IsNullOrEmpty(request.Status) && request.Status != order.status)
            {
                var validStatuses = new[] { "received_package", "payment_paid", "delivered", "cancelled" };
                
                if (!validStatuses.Contains(request.Status))
                {
                    return BadRequest(new { message = "Invalid status" });
                }

                if (userRole != "executive")
                {
                    // Workers can only update to "payment_paid"
                    if (request.Status != "payment_paid")
                    {
                        return BadRequest(new { message = "Workers can only update status to 'payment_paid'" });
                    }

                    // Workers cannot update if status is already "payment_paid" or beyond
                    if (order.status == "payment_paid" || order.status == "delivered" || order.status == "canceled")
                    {
                        return BadRequest(new { message = "Cannot update order after payment is marked as received" });
                    }
                }
                // Executives can set to delivered or canceled at any time

                changes["status"] = new { from = order.status, to = request.Status };
                order.status = request.Status;
            }

            // Update common fields (all users can update these before payment_paid)
            bool canEditDetails = userRole == "executive" || 
                                 (order.status != "payment_paid" && order.status != "delivered" && order.status != "canceled");

            if (canEditDetails)
            {
                if (!string.IsNullOrEmpty(request.Notes) && request.Notes != order.notes)
                {
                    changes["notes"] = new { from = order.notes, to = request.Notes };
                    order.notes = request.Notes;
                }

                if (!string.IsNullOrEmpty(request.PhotoUrl) && request.PhotoUrl != order.photo_url)
                {
                    changes["photoUrl"] = new { from = order.photo_url, to = request.PhotoUrl };
                    order.photo_url = request.PhotoUrl;
                }

                if (!string.IsNullOrEmpty(request.CustomerName) && request.CustomerName != order.customer_name)
                {
                    changes["customerName"] = new { from = order.customer_name, to = request.CustomerName };
                    order.customer_name = request.CustomerName;
                }

                if (!string.IsNullOrEmpty(request.CustomerPhone) && request.CustomerPhone != order.customer_phone)
                {
                    changes["customerPhone"] = new { from = order.customer_phone, to = request.CustomerPhone };
                    order.customer_phone = request.CustomerPhone;
                }

                if (!string.IsNullOrEmpty(request.CargoType) && request.CargoType != order.cargo_type)
                {
                    changes["cargoType"] = new { from = order.cargo_type, to = request.CargoType };
                    order.cargo_type = request.CargoType;
                }

                if (request.Weight.HasValue && request.Weight != order.weight)
                {
                    changes["weight"] = new { from = order.weight, to = request.Weight };
                    order.weight = request.Weight;
                }

                // if (!string.IsNullOrEmpty(request.PickupAddress) && request.PickupAddress != order.pickup_address)
                // {
                //     changes["pickupAddress"] = new { from = order.pickup_address, to = request.PickupAddress };
                //     order.pickup_address = request.PickupAddress;
                // }

                if (request.Price.HasValue && request.Price != order.price)
                {
                    changes["price"] = new { from = order.price, to = request.Price };
                    order.price = request.Price;
                }

                if (!string.IsNullOrEmpty(request.ReceiverName) && request.ReceiverName != order.receiver_name)
                {
                    changes["receiverName"] = new { from = order.receiver_name, to = request.ReceiverName };
                    order.receiver_name = request.ReceiverName;
                }

                if (!string.IsNullOrEmpty(request.ReceiverPhone) && request.ReceiverPhone != order.receiver_phone)
                {
                    changes["receiverPhone"] = new { from = order.receiver_phone, to = request.ReceiverPhone };
                    order.receiver_phone = request.ReceiverPhone;
                }
            }
            else if (changes.Count == 0)
            {
                // If trying to edit details after payment_paid and not an executive
                return BadRequest(new { message = "Cannot update order details after payment is marked as received. Only executives can make changes." });
            }

            // Only executives can reassign orders
            if (userRole == "executive" && request.WorkerId.HasValue && request.WorkerId != order.worker_id)
            {
                changes["workerId"] = new { from = order.worker_id, to = request.WorkerId };
                order.worker_id = request.WorkerId;
            }

            order.updated_at = DateTime.UtcNow;

            // Update the order
            await connection.ExecuteAsync(@"
                UPDATE orders SET 
                    status = @status,
                    notes = @notes,
                    photo_url = @photo_url,
                    price = @price,
                    receiver_name = @receiver_name,
                    receiver_phone = @receiver_phone,
                    customer_name = @customer_name,
                    customer_phone = @customer_phone,
                    cargo_type = @cargo_type,
                    weight = @weight,
                    worker_id = @worker_id,
                    updated_at = @updated_at
                WHERE id = @id",
                order);

            // Log the changes
            if (changes.Count > 0)
            {
                var action = oldStatus != order.status ? "status_changed" : "updated";
                await LogOrderHistory(order.id, action, oldStatus, order.status, changes);
            }

            return Ok(order);
        }
        
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] StatusUpdateRequest request)
        {
            // using var connection = _supabaseService.GetConnection();
            
            // await connection.ExecuteAsync(
            //     "UPDATE orders SET status = @Status, updated_at = @UpdatedAt WHERE id = @Id",
            //     new { Id = id, request.Status, UpdatedAt = DateTime.UtcNow });
            
            // return Ok(new { message = "Status updated successfully" });
            return await UpdateOrder(id, new UpdateOrderRequest { Status = request.Status });

        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOrder(Guid id)
        {
            using var connection = _supabaseService.GetConnection();
            
            var (userId, userRole, _) = GetCurrentUser();

            // Only executives can delete orders
            if (userRole != "executive")
            {
                return Forbid();
            }

            var order = await connection.QuerySingleOrDefaultAsync<Order>(
                "SELECT * FROM orders WHERE id = @Id",
                new { Id = id });

            if (order == null)
                return NotFound();

            await connection.ExecuteAsync(
                "DELETE FROM orders WHERE id = @Id",
                new { Id = id });

            return NoContent();
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


        private (Guid userId, string userRole, string userName) GetCurrentUser()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value ?? "worker";
            var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";

            if (string.IsNullOrEmpty(userIdClaim))
            {
                throw new UnauthorizedAccessException();
            }

            return (Guid.Parse(userIdClaim), userRole, userName);
        }

        // Helper method to log order changes
        private async Task LogOrderHistory(Guid orderId, string action, string oldStatus = null, string newStatus = null, Dictionary<string, object> changes = null)
        {
            var (userId, _, userName) = GetCurrentUser();

            using var connection = _supabaseService.GetConnection();
            
            var changesJson = changes != null ? JsonSerializer.Serialize(changes) : null;

            await connection.ExecuteAsync(@"
                INSERT INTO order_history (
                    id, order_id, worker_id, worker_name, action,
                    old_status, new_status, changes, created_at
                ) VALUES (
                    @Id, @OrderId, @WorkerId, @WorkerName, @Action,
                    @OldStatus, @NewStatus, @Changes, @CreatedAt
                )", new {
                    Id = Guid.NewGuid(),
                    OrderId = orderId,
                    WorkerId = userId,
                    WorkerName = userName,
                    Action = action,
                    OldStatus = oldStatus,
                    NewStatus = newStatus,
                    Changes = changesJson,
                    CreatedAt = DateTime.UtcNow
                });
        }
    }
    
    public class CreateOrderRequest
    {
        public string CustomerName { get; set; } = string.Empty;
        //public string OrderNumber { get; set; } = string.Empty;
        public string? CustomerPhone { get; set; }
        //public string PickupAddress { get; set; } = string.Empty;
        public string DeliveryAddress { get; set; } = string.Empty;
        public string? CargoType { get; set; }
        public decimal? Weight { get; set; }
        public decimal? Price { get; set; }
        public string? ReceiverName { get; set; }
        public string? ReceiverPhone { get; set; }
        public string? Notes { get; set; }
        public string? PhotoBase64 { get; set; }
    }

    public class UpdateOrderRequest
    {
        public string? Status { get; set; }
        public string? Notes { get; set; }
        public string? PhotoUrl { get; set; }
        public decimal? Price { get; set; }
        public string? ReceiverName { get; set; }
        public string? ReceiverPhone { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
        public string? CargoType { get; set; }
        public decimal? Weight { get; set; }
        //public string? PickupAddress { get; set; }
        public Guid? WorkerId { get; set; }
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