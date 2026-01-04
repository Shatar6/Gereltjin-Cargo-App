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
}