using Npgsql;

namespace GereltjinCargoApi.Services
{
    public class SupabaseService
    {
        private readonly string _connectionString;
        
        public SupabaseService(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection");
        }
        
        public NpgsqlConnection GetConnection()
        {
            return new NpgsqlConnection(_connectionString);
        }
    }

    public class SupabaseStorageService
    {
        private readonly IConfiguration _configuration;
        private readonly Supabase.Client _supabase;

        public SupabaseStorageService(IConfiguration configuration)
        {
            _configuration = configuration;
            
            var url = _configuration["Supabase:Url"];
            var key = _configuration["Supabase:ServiceKey"];

            if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(key))
                throw new Exception("Supabase config missing");
            
            var options = new Supabase.SupabaseOptions
            {
                AutoConnectRealtime = false
            };
            
            _supabase = new Supabase.Client(url, key, options);
            _supabase.InitializeAsync().Wait();
        }

        public async Task<string> UploadImageAsync(string base64Image, string orderNumber)
        {
            try
            {
                // Remove data:image/jpeg;base64, prefix if present
                var base64Data = base64Image;
                if (base64Data.Contains(","))
                {
                    base64Data = base64Data.Split(',')[1];
                }

                // Convert base64 to byte array
                var imageBytes = Convert.FromBase64String(base64Data);

                // Validate file size (max 5MB)
                if (imageBytes.Length > 5 * 1024 * 1024)
                {
                    throw new Exception("Image size exceeds 5MB limit");
                }

                // Generate unique filename
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                var fileName = $"{orderNumber}_{timestamp}.jpg";
                var filePath = $"order-photos/{fileName}";

                var bucket = "order-photo-bucket";

                // Upload to Supabase Storage
                var result = await _supabase.Storage
                    .From(bucket)
                    .Upload(imageBytes, filePath, new Supabase.Storage.FileOptions
                    {
                        ContentType = "image/jpeg",
                        Upsert = true
                    });

                // Get public URL
                var publicUrl = _supabase.Storage
                    .From(bucket)
                    .GetPublicUrl(filePath);

                return publicUrl;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error uploading image: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> DeleteImageAsync(string photoUrl)
        {
            try
            {
                if (string.IsNullOrEmpty(photoUrl))
                    return false;

                // Extract filename from URL
                var uri = new Uri(photoUrl);
                var segments = uri.Segments;
                var fileName = segments[segments.Length - 1];
                var filePath = $"order-photos/{fileName}";

                var bucket = "order-photo-bucket";


                await _supabase.Storage
                    .From(bucket)
                    .Remove(new List<string> { filePath });

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting image: {ex.Message}");
                return false;
            }
        }
    }
}