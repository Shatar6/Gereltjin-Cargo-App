namespace GereltjinCargoApi.Models
{
    public class Order
    {
        public Guid id { get; set; }
        public string order_number { get; set; } = string.Empty;
        public string customer_name { get; set; } = string.Empty;
        public string? customer_phone { get; set; }
        public string pickup_address { get; set; } = string.Empty;
        public string? cargo_type { get; set; }
        public decimal? weight { get; set; }
        public string status { get; set; } = "Хүлээгдэж байна";
        public Guid? worker_id { get; set; }
        public string? notes { get; set; }
        public string? photo_url { get; set; }
        public DateTime created_at { get; set; }
        public DateTime updated_at { get; set; }

        public decimal? price { get; set; }
        public string receiver_name { get; set; }
        public string receiver_phone { get; set; }
        public string? worker_name { get; set; }

        public Worker Worker { get; set; }
        public ICollection<OrderHistory> History { get; set; }
    }
    
    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
    
    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public Guid UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }
}