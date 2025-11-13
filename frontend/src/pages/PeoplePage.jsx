import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { profilesAPI } from '../utils/api';
import PersonCard from '../components/PersonCard';
import FilterBar from '../components/FilterBar';
import './PeoplePage.css';

function PeoplePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    skills: searchParams.getAll('skills'),
    industries: searchParams.getAll('industries'),
    openToWork: searchParams.get('openToWork') === 'true'
  });
  const [availableFilters, setAvailableFilters] = useState({
    skills: [],
    industries: []
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 12
  });

  // Fetch available filter options
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const data = await profilesAPI.getFilters();
        if (data.success) {
          setAvailableFilters(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch filters:', err);
      }
    };
    fetchFilters();
  }, []);

  // Fetch profiles when filters change
  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const queryParams = {
          ...filters,
          page: pagination.page,
          limit: pagination.limit
        };
        
        const data = await profilesAPI.getAll(queryParams);
        
        if (data.success) {
          setProfiles(data.data);
          setPagination(prev => ({ ...prev, total: data.pagination.total }));
        }
      } catch (err) {
        setError('Failed to load profiles. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [filters, pagination.page, pagination.limit]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.openToWork) params.set('openToWork', 'true');
    filters.skills.forEach(skill => params.append('skills', skill));
    filters.industries.forEach(ind => params.append('industries', ind));
    setSearchParams(params);
  }, [filters, setSearchParams]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      skills: [],
      industries: [],
      openToWork: false
    });
  };

  const hasActiveFilters = filters.search || filters.skills.length > 0 || 
                           filters.industries.length > 0 || filters.openToWork;

  return (
    <div className="people-page">
      <div className="people-page__header">
        <h1>People</h1>
        <p className="text-muted">
          Discover talented professionals with diverse skills and expertise
        </p>
      </div>

      <FilterBar
        filters={filters}
        availableFilters={availableFilters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {loading && (
        <div className="loading">
          <p>Loading profiles...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && profiles.length === 0 && (
        <div className="empty-state">
          <h3 className="empty-state__title">No profiles found</h3>
          <p className="empty-state__text">
            Try adjusting your filters or search terms
          </p>
        </div>
      )}

      {!loading && !error && profiles.length > 0 && (
        <>
          <div className="people-page__results-info">
            <p className="text-muted text-small">
              Showing {profiles.length} of {pagination.total} profiles
            </p>
          </div>

          {pagination.total > pagination.limit && (
            <div className="pagination pagination--top">
              <button
                className="pagination__button"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="pagination__icon" />
              </button>
              <span className="pagination__page-number">
                {pagination.page}
              </span>
              <button
                className="pagination__button"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                aria-label="Next page"
              >
                <ChevronRight className="pagination__icon" />
              </button>
            </div>
          )}

          <div className="people-grid">
            {profiles.map(profile => (
              <PersonCard key={profile.slug} person={profile} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default PeoplePage;


