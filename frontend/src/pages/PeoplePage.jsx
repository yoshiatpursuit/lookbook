import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Frown } from 'lucide-react';
import { profilesAPI } from '../utils/api';
import PersonCard from '../components/PersonCard';
import FilterBar from '../components/FilterBar';
import { useLoadingProgress } from '../contexts/LoadingProgressContext';
import './PeoplePage.css';

function PeoplePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { startLoading, setLoadingProgress, completeLoading } = useLoadingProgress();
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
      startLoading();
      setLoadingProgress(10);
      
      try {
        setLoadingProgress(30);
        const queryParams = {
          ...filters,
          page: pagination.page,
          limit: pagination.limit
        };
        
        const data = await profilesAPI.getAll(queryParams);
        
        setLoadingProgress(80);
        if (data.success) {
          setProfiles(data.data);
          setPagination(prev => ({ ...prev, total: data.pagination.total }));
        }
        setLoadingProgress(100);
        completeLoading();
      } catch (err) {
        setError('Failed to load profiles. Please try again.');
        console.error(err);
        setLoadingProgress(100);
        completeLoading();
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

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && profiles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Frown 
            className="error-icon" 
            size={48} 
            stroke="#4242ea" 
            strokeWidth={1.5}
          />
          <p className="mt-4 text-lg font-medium text-gray-700">No results found</p>
          <p className="mt-2 text-sm text-gray-500">
            Try adjusting your filters or search terms
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="mt-4 px-4 py-2 text-sm font-medium text-[#4242ea] border border-[#4242ea] rounded-md hover:bg-[#4242ea] hover:text-white transition-colors"
            >
              Clear all filters
            </button>
          )}
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


