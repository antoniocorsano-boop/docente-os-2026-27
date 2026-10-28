// QL2-A test-runner binding.
// Product CI uses an explicit test inventory plus presentation source-binding glob.
// Import the QL2-A domain and persistence contracts here so they execute in the
// governed product test suite without widening the global test command.
import '../domain/civic-education-contribution.test'
import '../infrastructure/supabase/civic-education-persistence-contract.test'
