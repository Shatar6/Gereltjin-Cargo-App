namespace GereltjinCargoApi.Models
{
    public class Worker
    {
        public Guid Id { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public string Name { get; set; }
        public string Role { get; set; } = "worker"; // New field
        public DateTime CreatedAt { get; set; }
    }
}