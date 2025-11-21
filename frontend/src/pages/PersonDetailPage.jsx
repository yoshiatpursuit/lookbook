import { useState, useEffect, useLayoutEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { profilesAPI, projectsAPI, getImageUrl } from '../utils/api';
import analytics from '../utils/analytics';
import { useLoadingProgress } from '../contexts/LoadingProgressContext';
import LazyVideo from '../components/LazyVideo';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Linkedin, Globe, Camera, Code, Rocket, Zap, Lightbulb, Target, Square, Grid3x3, List, ChevronLeft, ChevronRight, Menu, X, Frown } from 'lucide-react';

// Custom hook for debounced value
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Helper function to adjust color brightness for gradients
const adjustColor = (hex, percent) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1);
};

// Helper function to format name as "FirstName L."
const formatNameShort = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0);
  return `${firstName} ${lastInitial}.`;
};

// Helper function to convert video URLs to embeddable format
const getEmbedUrl = (url) => {
  if (!url) return url;
  
  // YouTube patterns
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  
  // Vimeo patterns
  const vimeoRegex = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}`;
  }
  
  // If already an embed URL, return as-is
  if (url.includes('youtube.com/embed/') || url.includes('player.vimeo.com/video/')) {
    return url;
  }
  
  // Return original URL if no pattern matches
  return url;
};

// ProfileCard component with holographic effect
const ProfileCard = ({ prof, onClick }) => {
  const [cardRef, setCardRef] = useState(null);
  const isFeatured = prof.featured === true;
  
  const handleMouseMove = (e) => {
    if (!cardRef) return;
    const rect = cardRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Featured cards get more dramatic tilt (10 degrees vs 5 degrees)
    const maxRotation = isFeatured ? 10 : 5;
    const rotateX = ((y - centerY) / centerY) * -maxRotation;
    const rotateY = ((x - centerX) / centerX) * maxRotation;
    
    // Featured cards lift higher on hover
    const liftAmount = isFeatured ? -8 : -4;
    cardRef.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(${liftAmount}px)`;
    
    // Update holographic gradient position
    const holoElement = cardRef.querySelector('.holo-effect');
    if (holoElement) {
      holoElement.style.backgroundPosition = `${(x / rect.width) * 100}% ${(y / rect.height) * 100}%`;
    }

    // Update reflection position for featured cards
    if (isFeatured) {
      const reflectionElement = cardRef.querySelector('.reflection-effect');
      if (reflectionElement) {
        const xPercent = (x / rect.width) * 100;
        reflectionElement.style.backgroundPosition = `${xPercent}% 0`;
      }
    }
  };
  
  const handleMouseLeave = () => {
    if (!cardRef) return;
    cardRef.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
  };
  
  return (
    <div 
      ref={setCardRef}
      className={`rounded-xl person-card-wrapper ${isFeatured ? 'featured' : ''} person-card-cursor`}
      style={{
        transformStyle: 'preserve-3d',
        WebkitTransformStyle: 'preserve-3d'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Card 
        className="rounded-xl border-0 shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden relative person-card"
        style={{
          backgroundColor: 'white', 
          aspectRatio: '3/4',
          borderRadius: '0.75rem'
        }}
        onClick={onClick}
      >
      {/* Background Image */}
      {(prof.photo_url || prof.photoUrl) && (
        <div className="absolute inset-0 z-0">
          <img 
            src={getImageUrl(prof.photo_url || prof.photoUrl)}
            alt={prof.name}
            className="w-full h-full object-cover opacity-90"
            loading="lazy"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70"></div>
          
          {/* Holographic Effect Overlay - Enhanced for featured */}
          <div className={`holo-effect ${isFeatured ? 'featured' : ''} absolute inset-0 opacity-0 hover:opacity-30 transition-opacity duration-300 pointer-events-none`}></div>
          
          {/* Ultra Premium effects - Only for featured cards */}
          {isFeatured && (
            <>
              {/* Foil texture */}
              <div className="foil-texture"></div>
              
              {/* Sparkle particles */}
              <div className="sparkle" style={{zIndex: 20}}></div>
              <div className="sparkle" style={{zIndex: 20}}></div>
              <div className="sparkle" style={{zIndex: 20}}></div>
              <div className="sparkle" style={{zIndex: 20}}></div>
              <div className="sparkle" style={{zIndex: 20}}></div>
              
              {/* Reflection effect */}
              <div className="reflection-effect"></div>
            </>
          )}
        </div>
      )}
      {!(prof.photo_url || prof.photoUrl) && (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-600 to-purple-600"></div>
      )}
      
      <CardContent className="relative z-10 p-6 h-full flex flex-col justify-between">
        {/* Top Section - Name and Title Only */}
        <div>
          <h3 className="font-bold text-white uppercase mb-2 leading-none" style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem'}}>{prof.name}</h3>
          {prof.title && (
            <p className="text-white mb-2" style={{fontSize: '14px', fontWeight: '500', textShadow: '0 1px 2px rgba(0,0,0,0.5)'}}>{prof.title}</p>
          )}
        </div>
        
        {/* Bottom Section - Bio, Skills and Status */}
        <div>
          {/* Bio */}
          {prof.bio && (
            <p className="text-white leading-snug mb-3 line-clamp-2" style={{fontSize: '13px', textShadow: '0 1px 2px rgba(0,0,0,0.5)'}}>{prof.bio}</p>
          )}
          
          {/* Skills */}
          {prof.skills && prof.skills.length > 0 && (
            <div className="mb-4">
              <h4 className="text-white font-semibold mb-2" style={{fontSize: '14px'}}>Skills</h4>
              <div className="flex flex-wrap gap-1">
                {prof.skills.slice(0, 5).map((skill, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">
                    {skill}
                  </span>
                ))}
                {prof.skills.length > 5 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">
                    +{prof.skills.length - 5}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Industry Tags and Status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {prof.industry_expertise && prof.industry_expertise.slice(0, 2).map((industry, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-purple-600 text-white font-semibold uppercase">
                  {industry}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};

// Memoize ProfileCard to prevent unnecessary re-renders
const MemoizedProfileCard = memo(ProfileCard, (prevProps, nextProps) => {
  return prevProps.prof.slug === nextProps.prof.slug && 
         prevProps.prof.featured === nextProps.prof.featured;
});

// ProjectCard component with holographic effect
const ProjectCard = ({ proj, onClick }) => {
  const [cardRef, setCardRef] = useState(null);
  const isFeatured = proj.featured === true;
  
  const handleMouseMove = (e) => {
    if (!cardRef) return;
    const rect = cardRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Featured cards get more dramatic tilt (10 degrees vs 5 degrees)
    const maxRotation = isFeatured ? 10 : 5;
    const rotateX = ((y - centerY) / centerY) * -maxRotation;
    const rotateY = ((x - centerX) / centerX) * maxRotation;
    
    // Featured cards lift higher on hover
    const liftAmount = isFeatured ? -8 : -4;
    cardRef.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(${liftAmount}px)`;
    
    // Update holographic gradient position
    const holoElement = cardRef.querySelector('.holo-effect');
    if (holoElement) {
      holoElement.style.backgroundPosition = `${(x / rect.width) * 100}% ${(y / rect.height) * 100}%`;
    }

    // Update reflection position for featured cards
    if (isFeatured) {
      const reflectionElement = cardRef.querySelector('.reflection-effect');
      if (reflectionElement) {
        const xPercent = (x / rect.width) * 100;
        reflectionElement.style.backgroundPosition = `${xPercent}% 0`;
      }
    }
  };
  
  const handleMouseLeave = () => {
    if (!cardRef) return;
    cardRef.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
  };
  
  const adjustColor = (color, amount) => {
    const clamp = (val) => Math.min(Math.max(val, 0), 255);
    const num = parseInt(color.replace('#', ''), 16);
    const r = clamp((num >> 16) + amount);
    const g = clamp(((num >> 8) & 0x00ff) + amount);
    const b = clamp((num & 0x0000ff) + amount);
    return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
  };
  
  const formatNameShort = (name) => {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length < 2) return name;
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  };
  
  return (
    <div 
      ref={setCardRef}
      className={`rounded-xl project-card-wrapper ${isFeatured ? 'featured' : ''} project-card-cursor`}
      style={{
        transformStyle: 'preserve-3d',
        WebkitTransformStyle: 'preserve-3d'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Card 
        className="rounded-xl border-0 shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden relative project-card"
        style={{backgroundColor: 'white', aspectRatio: '3/4'}}
        onClick={onClick}
      >
        {/* Background Image or Color */}
        {proj.main_image_url ? (
          <div className="absolute inset-0 z-0">
            <img 
              src={getImageUrl((() => {
                try {
                  const images = JSON.parse(proj.main_image_url);
                  if (Array.isArray(images)) {
                    return typeof images[0] === 'string' ? images[0] : images[0].url;
                  }
                } catch {}
                return proj.main_image_url;
              })())}
              alt={proj.title}
              className="w-full h-full object-cover opacity-90"
              loading="lazy"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80"></div>
            
            {/* Holographic Effect Overlay - Enhanced for featured */}
            <div className={`holo-effect ${isFeatured ? 'featured' : ''} absolute inset-0 opacity-0 hover:opacity-30 transition-opacity duration-300 pointer-events-none`}></div>
            
            {/* Ultra Premium effects - Only for featured cards */}
            {isFeatured && (
              <>
                {/* Foil texture */}
                <div className="foil-texture"></div>
                
                {/* Sparkle particles */}
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                
                {/* Reflection effect */}
                <div className="reflection-effect"></div>
              </>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 z-0" style={{
            background: `linear-gradient(135deg, ${proj.background_color || '#6366f1'} 0%, ${adjustColor(proj.background_color || '#6366f1', -30)} 100%)`
          }}>
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60"></div>
            {/* Holographic Effect Overlay */}
            <div className={`holo-effect ${isFeatured ? 'featured' : ''} absolute inset-0 opacity-0 hover:opacity-30 transition-opacity duration-300 pointer-events-none`}></div>
            
            {/* Display icon if available */}
            {proj.icon_url && (
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <img 
                  src={getImageUrl(proj.icon_url)} 
                  alt={`${proj.title} icon`}
                  className="w-32 h-32 object-contain"
                />
              </div>
            )}
            
            {/* Ultra Premium effects - Only for featured cards */}
            {isFeatured && (
              <>
                {/* Foil texture */}
                <div className="foil-texture"></div>
                
                {/* Sparkle particles */}
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                
                {/* Reflection effect */}
                <div className="reflection-effect"></div>
              </>
            )}
          </div>
        )}
        
        <CardContent className="relative z-10 p-6 h-full flex flex-col justify-between">
          {/* Icon Badge (top-right) */}
          {proj.icon_url && (
            <div className="absolute top-4 right-4 w-12 h-12 bg-white rounded-lg shadow-lg p-2 flex items-center justify-center">
              <img 
                src={getImageUrl(proj.icon_url)} 
                alt={`${proj.title} icon`}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          
          {/* Top Section - Title and Description */}
          <div>
            <h3 className="font-bold text-white uppercase mb-3 leading-none" style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem'}}>{proj.title}</h3>
            {proj.short_description && (
              <p className="text-white leading-snug mb-2" style={{fontSize: '14px', textShadow: '0 1px 2px rgba(0,0,0,0.5)'}}>{proj.short_description}</p>
            )}
            
            {/* Project Partner */}
            {proj.has_partner && (proj.partner_logo_url || proj.partner_name) && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-white text-xs opacity-75">Project Partner</span>
                {proj.partner_logo_url ? (
                  <img 
                    src={getImageUrl(proj.partner_logo_url)}
                    alt={proj.partner_name || 'Partner'}
                    className="h-5 object-contain"
                    style={{
                      filter: 'brightness(0) invert(1)',
                      maxWidth: '120px'
                    }}
                  />
                ) : (
                  <span className="text-white text-xs font-semibold">{proj.partner_name}</span>
                )}
              </div>
            )}
          </div>
          
          {/* Bottom Section - Team and Category */}
          <div>
            {/* Project Team */}
            <div className="mb-4">
              <h4 className="text-white font-semibold mb-2" style={{fontSize: '14px'}}>Project Team</h4>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                {proj.participants && proj.participants.slice(0, 4).map((participant, i) => (
                    <div 
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-semibold"
                      title={participant.name || participant}
                    >
                      {(participant.photo_url || participant.photoUrl) ? (
                        <img 
                          src={getImageUrl(participant.photo_url || participant.photoUrl)}
                          alt={participant.name || participant}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{(participant.name || participant).split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}</span>
                      )}
                  </div>
                ))}
                  {proj.participants && proj.participants.length > 4 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-white text-xs font-semibold">
                      +{proj.participants.length - 4}
                    </div>
                  )}
                </div>
                <p className="text-white text-sm">
                  {proj.participants && proj.participants.map(p => formatNameShort(p.name || p)).join(', ')}
                </p>
              </div>
            </div>
            
            {/* Category Badge */}
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
              {proj.sectors && proj.sectors.length > 0 ? (
                  proj.sectors.map((sector, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-purple-600 text-white font-semibold uppercase">
                      {sector}
                  </span>
                  ))
              ) : proj.skills && proj.skills.length > 0 ? (
                  proj.skills.slice(0, 2).map((skill, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-blue-600 text-white font-semibold">
                      {skill}
                  </span>
                  ))
                ) : null}
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Memoize ProjectCard to prevent unnecessary re-renders
const MemoizedProjectCard = memo(ProjectCard, (prevProps, nextProps) => {
  return prevProps.proj.slug === nextProps.proj.slug && 
         prevProps.proj.featured === nextProps.proj.featured;
});

function PersonDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Initialize viewMode based on current URL path immediately
  const initialViewMode = location.pathname.startsWith('/projects') ? 'projects' : 'people';
  const [person, setPerson] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gridListLoading, setGridListLoading] = useState(false); // Loading state for grid/list views
  const [error, setError] = useState(null);
  const { startLoading, setLoadingProgress, completeLoading } = useLoadingProgress();
  const isFetchingRef = useRef(false); // Track if we're currently fetching to prevent multiple simultaneous fetches
  const [allProfiles, setAllProfiles] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [viewMode, setViewMode] = useState(initialViewMode); // Initialize from URL
  const [layoutView, setLayoutView] = useState('grid'); // 'detail' or 'grid' - default to grid
  const [gridPage, setGridPage] = useState(0); // For grid pagination
  const [totalProfiles, setTotalProfiles] = useState(0); // Total count from server
  const [totalProjects, setTotalProjects] = useState(0); // Total count from server
  const [projectCarouselIndex, setProjectCarouselIndex] = useState(0); // For project carousel
  
  // Detect viewMode from URL - run this first
  useEffect(() => {
    const newViewMode = location.pathname.startsWith('/projects') ? 'projects' : 'people';
    setViewMode(newViewMode);
    setFilterView(newViewMode);
    // Reset error when switching modes
    setError(null);
    setPerson(null);
    setProject(null);
  }, [location.pathname]);
  
  // Sidebar state
  const [filterView, setFilterView] = useState(initialViewMode);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Filter state
  const [peopleFilters, setPeopleFilters] = useState({
    search: '',
    skills: [],
    industries: [],
    openToWork: false
  });
  const [availablePeopleFilters, setAvailablePeopleFilters] = useState({
    skills: [],
    industries: []
  });
  
  const [projectFilters, setProjectFilters] = useState({
    search: '',
    skills: [],
    sectors: []
  });
  const [availableProjectFilters, setAvailableProjectFilters] = useState({
    skills: [],
    sectors: []
  });

  // Debounce search terms to reduce API calls (500ms feels more responsive)
  const debouncedPeopleSearch = useDebounce(peopleFilters.search, 500);
  const debouncedProjectSearch = useDebounce(projectFilters.search, 500);

  // Filtered data based on search and filters
  const filteredProfiles = useMemo(() => allProfiles.filter(profile => {
    // Search filter (using debounced value)
    if (debouncedPeopleSearch) {
      const searchLower = debouncedPeopleSearch.toLowerCase();
      const matchesName = profile.name?.toLowerCase().includes(searchLower);
      const matchesBio = profile.bio?.toLowerCase().includes(searchLower);
      const matchesSkills = profile.skills?.some(skill => skill.toLowerCase().includes(searchLower));
      if (!matchesName && !matchesBio && !matchesSkills) return false;
    }
    
    // Skills filter
    if (peopleFilters.skills.length > 0) {
      const hasSkill = peopleFilters.skills.some(filterSkill => 
        profile.skills?.includes(filterSkill)
      );
      if (!hasSkill) return false;
    }
    
    // Industries filter
    if (peopleFilters.industries.length > 0) {
      const hasIndustry = peopleFilters.industries.some(filterIndustry => 
        profile.industry_expertise?.includes(filterIndustry)
      );
      if (!hasIndustry) return false;
    }
    
    // Open to work filter
    if (peopleFilters.openToWork && !profile.open_to_work) {
      return false;
    }
    
    return true;
  }), [allProfiles, debouncedPeopleSearch, peopleFilters.skills, peopleFilters.industries, peopleFilters.openToWork]);

  const filteredProjects = useMemo(() => allProjects.filter(project => {
    // Search filter (using debounced value)
    if (debouncedProjectSearch) {
      const searchLower = debouncedProjectSearch.toLowerCase();
      const matchesTitle = project.title?.toLowerCase().includes(searchLower);
      const matchesSummary = project.summary?.toLowerCase().includes(searchLower);
      const matchesDescription = project.short_description?.toLowerCase().includes(searchLower);
      const matchesSkills = project.skills?.some(skill => skill.toLowerCase().includes(searchLower));
      if (!matchesTitle && !matchesSummary && !matchesDescription && !matchesSkills) return false;
    }
    
    // Skills filter
    if (projectFilters.skills.length > 0) {
      const hasSkill = projectFilters.skills.some(filterSkill => 
        project.skills?.includes(filterSkill)
      );
      if (!hasSkill) return false;
    }
    
    // Sectors filter
    if (projectFilters.sectors.length > 0) {
      const hasSector = projectFilters.sectors.some(filterSector => 
        project.sectors?.includes(filterSector)
      );
      if (!hasSector) return false;
    }
    
    return true;
  }), [allProjects, debouncedProjectSearch, projectFilters.skills, projectFilters.sectors]);

  // Filter person's projects based on project filters (for detail view)
  const filteredPersonProjects = useMemo(() => {
    if (!person?.projects) {
      return [];
    }
    
    // Handle case where projects might be null or not an array
    const projectsArray = Array.isArray(person.projects) ? person.projects : [];
    
    // If no filters are applied, return all projects
    const hasSearch = debouncedProjectSearch && debouncedProjectSearch.trim().length > 0;
    const hasSkillsFilter = projectFilters.skills.length > 0;
    const hasSectorsFilter = projectFilters.sectors.length > 0;
    
    if (!hasSearch && !hasSkillsFilter && !hasSectorsFilter) {
      return projectsArray;
    }
    
    const filtered = projectsArray.filter(project => {
      // Search filter (using debounced value)
      if (hasSearch) {
        const searchLower = debouncedProjectSearch.toLowerCase();
        const matchesTitle = project.title?.toLowerCase().includes(searchLower);
        const matchesSummary = project.summary?.toLowerCase().includes(searchLower);
        const matchesDescription = project.short_description?.toLowerCase().includes(searchLower);
        const matchesSkills = Array.isArray(project.skills) && project.skills.some(skill => 
          typeof skill === 'string' && skill.toLowerCase().includes(searchLower)
        );
        if (!matchesTitle && !matchesSummary && !matchesDescription && !matchesSkills) {
          return false;
        }
      }
      
      // Skills filter
      if (hasSkillsFilter) {
        if (!Array.isArray(project.skills) || project.skills.length === 0) {
          return false;
        }
        const hasSkill = projectFilters.skills.some(filterSkill => 
          project.skills.includes(filterSkill)
        );
        if (!hasSkill) return false;
      }
      
      // Sectors filter
      if (hasSectorsFilter) {
        if (!Array.isArray(project.sectors) || project.sectors.length === 0) {
          return false;
        }
        const hasSector = projectFilters.sectors.some(filterSector => 
          project.sectors.includes(filterSector)
        );
        if (!hasSector) return false;
      }
      
      return true;
    });
    
    return filtered;
  }, [person?.projects, debouncedProjectSearch, projectFilters.skills, projectFilters.sectors]);

  // Reset to first page when filters or search changes
  useEffect(() => {
    setGridPage(0);
  }, [peopleFilters.skills, peopleFilters.industries, peopleFilters.openToWork, projectFilters.skills, projectFilters.sectors, debouncedPeopleSearch, debouncedProjectSearch]);

  // Reset carousel index when filtered person projects change
  useEffect(() => {
    setProjectCarouselIndex(0);
  }, [filteredPersonProjects.length, debouncedProjectSearch, projectFilters.skills, projectFilters.sectors]);

  // Fetch data based on current view
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      // Prevent multiple simultaneous fetches
      if (isFetchingRef.current) {
        return;
      }
      
      if (layoutView === 'grid' || layoutView === 'list') {
        isFetchingRef.current = true;
        if (isMounted) {
          setGridListLoading(true);
          startLoading();
          setLoadingProgress(10); // Start at 10%
        }
      }
      
      if (layoutView === 'grid') {
        // Grid view: fetch paginated data (8 per page)
        const pageSize = 8;
        const offset = gridPage * pageSize;
        
        if (viewMode === 'people') {
          try {
            setLoadingProgress(30);
            const response = await profilesAPI.getAll({
              limit: pageSize,
              offset,
              search: debouncedPeopleSearch,
              skills: peopleFilters.skills.length > 0 ? peopleFilters.skills : undefined,
              industries: peopleFilters.industries.length > 0 ? peopleFilters.industries : undefined,
              openToWork: peopleFilters.openToWork ? true : undefined
            });
            
            setLoadingProgress(80);
            if (response.success) {
              setAllProfiles(response.data);
              const total = response.pagination?.total || response.total || response.data.length;
              setTotalProfiles(total);
            }
            setLoadingProgress(100);
            completeLoading();
          } catch (err) {
            console.error('Error fetching profiles:', err);
            setLoadingProgress(100);
            completeLoading();
          } finally {
            setGridListLoading(false);
            isFetchingRef.current = false;
          }
        } else if (viewMode === 'projects') {
          try {
            setLoadingProgress(30);
            const response = await projectsAPI.getAll({
              limit: pageSize,
              offset,
              search: debouncedProjectSearch,
              skills: projectFilters.skills.length > 0 ? projectFilters.skills : undefined,
              sectors: projectFilters.sectors.length > 0 ? projectFilters.sectors : undefined
            });
            
            setLoadingProgress(80);
            if (response.success) {
              setAllProjects(response.data);
              const total = response.pagination?.total || response.total || response.data.length;
              setTotalProjects(total);
            }
            setLoadingProgress(100);
            completeLoading();
          } catch (err) {
            console.error('Error fetching projects:', err);
            setLoadingProgress(100);
            completeLoading();
          } finally {
            setGridListLoading(false);
            isFetchingRef.current = false;
          }
        }
      } else if (layoutView === 'list') {
        // List view: fetch filtered data
        if (viewMode === 'people') {
          try {
            setLoadingProgress(30);
            const response = await profilesAPI.getAll({
              limit: 100,
              search: debouncedPeopleSearch,
              skills: peopleFilters.skills.length > 0 ? peopleFilters.skills : undefined,
              industries: peopleFilters.industries.length > 0 ? peopleFilters.industries : undefined,
              openToWork: peopleFilters.openToWork ? true : undefined
            });
            
            setLoadingProgress(80);
            if (response.success) {
              setAllProfiles(response.data);
              const total = response.pagination?.total || response.total || response.data.length;
              setTotalProfiles(total);
            }
            setLoadingProgress(100);
            completeLoading();
          } catch (err) {
            console.error('Error fetching profiles:', err);
            setLoadingProgress(100);
            completeLoading();
          } finally {
            setGridListLoading(false);
            isFetchingRef.current = false;
          }
        } else if (viewMode === 'projects') {
          try {
            setLoadingProgress(30);
            const response = await projectsAPI.getAll({
              limit: 100,
              search: debouncedProjectSearch,
              skills: projectFilters.skills.length > 0 ? projectFilters.skills : undefined,
              sectors: projectFilters.sectors.length > 0 ? projectFilters.sectors : undefined
            });
            
            setLoadingProgress(80);
            if (response.success) {
              setAllProjects(response.data);
              const total = response.pagination?.total || response.total || response.data.length;
              setTotalProjects(total);
            }
            setLoadingProgress(100);
            completeLoading();
          } catch (err) {
            console.error('Error fetching projects:', err);
            setLoadingProgress(100);
            completeLoading();
          } finally {
            setGridListLoading(false);
            isFetchingRef.current = false;
          }
        }
      }
      // Detail view: Don't fetch filtered data - keep full unfiltered list for navigation
      // The detail view fetch happens in the slug-based useEffect which always fetches full list
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
      isFetchingRef.current = false;
    };
  }, [gridPage, viewMode, debouncedPeopleSearch, debouncedProjectSearch, peopleFilters.skills, peopleFilters.industries, peopleFilters.openToWork, projectFilters.skills, projectFilters.sectors, layoutView]);

  // Fetch filters once on mount - these are cached
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [peopleFiltersData, projectFiltersData] = await Promise.all([
          profilesAPI.getFilters(),
          projectsAPI.getFilters()
        ]);
        
        if (peopleFiltersData.success) {
          setAvailablePeopleFilters(peopleFiltersData.data);
        }
        if (projectFiltersData.success) {
          setAvailableProjectFilters(projectFiltersData.data);
        }
      } catch (err) {
        console.error('Error fetching filters:', err);
      }
    };
    fetchFilters();
  }, []); // Run once on mount

  useEffect(() => {
    // If no slug, default to grid view
    if (!slug) {
      setLayoutView('grid');
      setLoading(false);
      // Data will be fetched by the paginated useEffect
      return;
    }
    
    // If there's a slug, show detail view
    setLayoutView('detail');
    setLoading(true);
    
    if (viewMode === 'people') {
      const fetchPersonAndList = async () => {
        startLoading();
        setLoadingProgress(10);
        try {
          setLoadingProgress(30);
          // Fetch both in parallel
          // In detail view, ALWAYS fetch full unfiltered list for navigation
          // This ensures we have the complete list regardless of previous filters
          const [personData, allData] = await Promise.all([
            profilesAPI.getBySlug(slug),
            profilesAPI.getAll({ limit: 100 }) // Always fetch full unfiltered list
          ]);
          
          setLoadingProgress(70);
          if (personData.success) {
            setPerson(personData.data);
            setProject(null);
            
            // Track person view
            analytics.personViewed(
              personData.data.slug,
              `${personData.data.first_name} ${personData.data.last_name}`,
              personData.data.skills || []
            );
            
            // Always update allProfiles with full unfiltered list for navigation
            if (allData.success) {
              setAllProfiles(allData.data);
              setTotalProfiles(allData.data.length);
            }
            
            // Find current index in the full list
            const profiles = allData.success ? allData.data : allProfiles;
            const index = profiles.findIndex(p => p.slug === slug);
            setCurrentIndex(index >= 0 ? index : -1);
            setError(null);
          } else {
            setError('Person not found');
          }
          setLoadingProgress(100);
          completeLoading();
        } catch (err) {
          console.error('Error fetching person:', err);
          setError('Person not found');
          setLoadingProgress(100);
          completeLoading();
        } finally {
          setLoading(false);
        }
      };
      fetchPersonAndList();
    } else if (viewMode === 'projects') {
      const fetchProjectAndList = async () => {
        startLoading();
        setLoadingProgress(10);
        try {
          setLoadingProgress(30);
          // Fetch both in parallel
          // In detail view, ALWAYS fetch full unfiltered list for navigation
          // This ensures we have the complete list regardless of previous filters
          const [projectData, allData] = await Promise.all([
            projectsAPI.getBySlug(slug),
            projectsAPI.getAll({ limit: 100 }) // Always fetch full unfiltered list
          ]);
          
          setLoadingProgress(70);
          if (projectData.success) {
            setProject(projectData.data);
            setPerson(null);
            
            // Track project view
            analytics.projectViewed(
              projectData.data.slug,
              projectData.data.title,
              projectData.data.skills || [],
              projectData.data.sectors || []
            );
            
            // Always update allProjects with full unfiltered list for navigation
            if (allData.success) {
              setAllProjects(allData.data);
              setTotalProjects(allData.data.length);
            }
            
            // Find current index in the full list
            const projects = allData.success ? allData.data : allProjects;
            const index = projects.findIndex(p => p.slug === slug);
            setCurrentIndex(index >= 0 ? index : -1);
            setError(null);
          } else {
            setError('Project not found');
          }
          setLoadingProgress(100);
          completeLoading();
        } catch (err) {
          console.error('Error fetching project:', err);
          setError('Project not found');
          setLoadingProgress(100);
          completeLoading();
        } finally {
          setLoading(false);
        }
      };
      fetchProjectAndList();
    } else {
      setLoading(false);
    }
  }, [slug, viewMode]);

  // Update currentIndex when allProfiles or allProjects array loads
  // Only update if we're in detail view and the current item is found in the list
  // This prevents navigation issues when filters are applied
  useEffect(() => {
    if (layoutView === 'detail' && slug) {
      if (viewMode === 'people' && person && allProfiles.length > 0) {
        const index = allProfiles.findIndex(p => p.slug === person.slug);
        // Only update if found (index >= 0), otherwise keep current index
        // This prevents switching to a different person when filters exclude the current one
        if (index >= 0) {
          setCurrentIndex(index);
        }
      } else if (viewMode === 'projects' && project && allProjects.length > 0) {
        const index = allProjects.findIndex(p => p.slug === project.slug);
        if (index >= 0) {
          setCurrentIndex(index);
        }
      }
    }
  }, [allProfiles, allProjects, person, project, viewMode, layoutView, slug]);

  // Hide scrollbar on body/html only when in 4x2 grid view (4 columns, exactly 8 items)
  useLayoutEffect(() => {
    const updateScrollbar = () => {
      // Check if we're in grid view, 4-column layout (2xl breakpoint), and have exactly 8 items
      const is4ColumnView = window.innerWidth >= 1536; // 2xl breakpoint
      const itemCount = viewMode === 'people' ? allProfiles.length : allProjects.length;
      const isPerfect4x2 = layoutView === 'grid' && is4ColumnView && itemCount === 8;
      
      // Apply synchronously before browser paints to prevent flash
      if (isPerfect4x2) {
        document.body.classList.add('grid-view-page');
        document.documentElement.classList.add('grid-view-page');
        // Also set inline style immediately to prevent flash
        document.body.style.overflowY = 'hidden';
        document.documentElement.style.overflowY = 'hidden';
      } else {
        document.body.classList.remove('grid-view-page');
        document.documentElement.classList.remove('grid-view-page');
        document.body.style.overflowY = '';
        document.documentElement.style.overflowY = '';
      }
    };
    
    // Update immediately
    updateScrollbar();
    
    // Also listen for window resize to update when switching between column layouts
    window.addEventListener('resize', updateScrollbar);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', updateScrollbar);
      document.body.classList.remove('grid-view-page');
      document.documentElement.classList.remove('grid-view-page');
      document.body.style.overflowY = '';
      document.documentElement.style.overflowY = '';
    };
  }, [layoutView, viewMode, allProfiles.length, allProjects.length]);

  // Prefetch adjacent items for instant navigation
  useEffect(() => {
    if (currentIndex < 0 || layoutView !== 'detail') return;
    
    const prefetchAdjacent = async () => {
      if (viewMode === 'people') {
        // Prefetch next person
        if (currentIndex < allProfiles.length - 1) {
          const nextSlug = allProfiles[currentIndex + 1]?.slug;
          if (nextSlug) {
            profilesAPI.getBySlug(nextSlug).catch(() => {}); // Fire and forget
          }
        }
        // Prefetch previous person
        if (currentIndex > 0) {
          const prevSlug = allProfiles[currentIndex - 1]?.slug;
          if (prevSlug) {
            profilesAPI.getBySlug(prevSlug).catch(() => {}); // Fire and forget
          }
        }
      } else if (viewMode === 'projects') {
        // Prefetch next project
        if (currentIndex < allProjects.length - 1) {
          const nextSlug = allProjects[currentIndex + 1]?.slug;
          if (nextSlug) {
            projectsAPI.getBySlug(nextSlug).catch(() => {}); // Fire and forget
          }
        }
        // Prefetch previous project
        if (currentIndex > 0) {
          const prevSlug = allProjects[currentIndex - 1]?.slug;
          if (prevSlug) {
            projectsAPI.getBySlug(prevSlug).catch(() => {}); // Fire and forget
          }
        }
      }
    };
    
    // Delay prefetch slightly to not interfere with current page load
    const timer = setTimeout(prefetchAdjacent, 300);
    return () => clearTimeout(timer);
  }, [currentIndex, viewMode, allProfiles, allProjects, layoutView]);

  // Navigation handlers
  const handlePrevious = () => {
    if (currentIndex > 0) {
      if (viewMode === 'people') {
        const prevProfile = allProfiles[currentIndex - 1];
        analytics.navigation('previous', person?.slug, prevProfile.slug);
        navigate(`/people/${prevProfile.slug}`);
      } else {
        const prevProject = allProjects[currentIndex - 1];
        analytics.navigation('previous', project?.slug, prevProject.slug);
        navigate(`/projects/${prevProject.slug}`);
      }
    }
  };

  const handleNext = () => {
    const maxLength = viewMode === 'people' ? allProfiles.length : allProjects.length;
    if (currentIndex < maxLength - 1) {
      if (viewMode === 'people') {
        const nextProfile = allProfiles[currentIndex + 1];
        analytics.navigation('next', person?.slug, nextProfile.slug);
        navigate(`/people/${nextProfile.slug}`);
      } else {
        const nextProject = allProjects[currentIndex + 1];
        analytics.navigation('next', project?.slug, nextProject.slug);
        navigate(`/projects/${nextProject.slug}`);
      }
    }
  };

  const handleTabSwitch = (tab) => {
    setFilterView(tab);
    setViewMode(tab);
    setCurrentIndex(-1);
    setGridPage(0); // Reset grid page when switching between people and projects
    setMobileMenuOpen(false); // Close mobile menu when switching tabs
    // Navigate to base route (grid view will be set by useEffect if no slug)
    if (tab === 'people') {
      navigate('/people');
    } else if (tab === 'projects') {
      navigate('/projects');
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        // In grid view, navigate between pages
        if (layoutView === 'grid') {
          if (gridPage > 0) {
            setGridPage(gridPage - 1);
          }
        } else {
          // In detail view, navigate between items
          handlePrevious();
        }
      } else if (e.key === 'ArrowRight') {
        // In grid view, navigate between pages
        if (layoutView === 'grid') {
          const maxPage = viewMode === 'people' 
            ? Math.ceil(filteredProfiles.length / 8) - 1 
            : Math.ceil(filteredProjects.length / 8) - 1;
          if (gridPage < maxPage) {
            setGridPage(gridPage + 1);
          }
        } else {
          // In detail view, navigate between items
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex, viewMode, allProfiles, allProjects, layoutView, gridPage]);

  const canGoPrevious = currentIndex > 0;
  const currentLength = viewMode === 'people' ? allProfiles.length : allProjects.length;
  const canGoNext = currentIndex >= 0 && currentIndex < currentLength - 1;

  if (loading) return <div className="min-h-screen" style={{backgroundColor: '#e3e3e3'}}></div>;
  // Only show error if we're done loading and viewMode has been set
  if (error && slug && !loading && viewMode) return <div className="flex items-center justify-center min-h-screen text-red-500" style={{backgroundColor: '#e3e3e3'}}>{error}</div>;
  if (!person && !project && slug && layoutView === 'detail') return <div className="flex items-center justify-center min-h-screen" style={{backgroundColor: '#e3e3e3'}}>Not found</div>;

  const initials = person?.name?.split(' ').map(n => n.charAt(0)).join('') || project?.title?.charAt(0) || '?';

  return (
    <div className={`flex ${layoutView === 'grid' ? 'grid-view-page' : ''}`} style={{backgroundColor: '#e3e3e3', width: '100%', maxWidth: '100vw', overflowX: 'hidden', minHeight: '100vh'}}>
      {/* Logo - Top Left - Fixed */}
      <div className="fixed left-2 lg:left-5 top-2 lg:top-4 z-50">
        <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
          <img 
            src="/pursuit-wordmark.png" 
            alt="Pursuit" 
            className="h-8"
          />
          <span className="text-sm lg:text-base hidden lg:inline">Lookbook</span>
        </a>
      </div>

      {/* Mobile: Fixed Top Right - Search, View Toggles, and Hamburger in one unit */}
      <div className="lg:hidden fixed top-2 right-2 z-50 flex items-center gap-2">
        {layoutView === 'grid' && (
          <div className="relative">
            <Input
              placeholder="Search"
              value={viewMode === 'people' ? peopleFilters.search : projectFilters.search}
              onChange={(e) => {
                if (viewMode === 'people') {
                  setPeopleFilters({ ...peopleFilters, search: e.target.value });
                } else {
                  setProjectFilters({ ...projectFilters, search: e.target.value });
                }
              }}
              className="search-input w-32 h-10 bg-white pr-14"
            />
            {(viewMode === 'people' ? peopleFilters.search : projectFilters.search) && (
              <button
                onClick={() => {
                  if (viewMode === 'people') {
                    setPeopleFilters({ ...peopleFilters, search: '' });
                  } else {
                    setProjectFilters({ ...projectFilters, search: '' });
                  }
                }}
                className="absolute right-[10px] top-1/2 -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 rounded-full border-[1.5px] border-white flex items-center justify-center search-clear-button transition-all"
                aria-label="Clear search"
              >
                <X className="w-3 h-3 lg:w-4 lg:h-4 text-white search-clear-icon" strokeWidth={2} />
              </button>
            )}
          </div>
        )}
        {/* View Toggle Icons */}
        <div className="view-toggle-container flex items-center gap-1 bg-white rounded-md border h-10 relative" style={{padding: 0}}>
          <div 
            className="view-toggle-slider"
            style={{
              transform: layoutView === 'grid' ? 'translateX(0)' : 'translateX(calc(2.5rem + 4px))'
            }}
          />
          <button 
            className="rounded hover:bg-gray-100/50"
            data-active={layoutView === 'grid'}
            onClick={() => {
              setLayoutView('grid');
              if (viewMode === 'people') {
                navigate('/people');
              } else {
                navigate('/projects');
              }
            }}
          >
            <Grid3x3 className="w-3 h-3" />
          </button>
          <button 
            className="rounded hover:bg-gray-100/50" 
            data-active={layoutView === 'detail'}
            onClick={() => {
              if (!slug) {
                if (viewMode === 'people' && filteredProfiles.length > 0) {
                  navigate(`/people/${filteredProfiles[0].slug}`);
                } else if (viewMode === 'projects' && filteredProjects.length > 0) {
                  navigate(`/projects/${filteredProjects[0].slug}`);
                }
              } else {
                setLayoutView('detail');
              }
            }}
          >
            <Square className="w-3 h-3" />
          </button>
        </div>
        {/* Hamburger Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-white rounded-md border border-gray-200 h-10 w-10 flex items-center justify-center"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop: Search Bar and View Icons - Scrolls with content */}
      <div className="hidden lg:block absolute top-4 z-40 right-2 left-[268px]">
        <div className="flex flex-row justify-between items-end gap-3" style={{marginLeft: 0, marginRight: 0, paddingLeft: '2rem', paddingRight: '1rem', width: '100%'}}>
          {/* Left side: Pagination controls - aligned with cards */}
          <div className="flex items-center gap-3" style={{marginLeft: 0, paddingLeft: 0}}>
            {/* Page indicator with navigation - left-aligned */}
            {layoutView === 'grid' && (
              <>
                {viewMode === 'projects' && Math.ceil(totalProjects / 8) > 1 && (
                  <div className="flex items-center">
                    <button
                      onClick={() => setGridPage(Math.max(0, gridPage - 1))}
                      disabled={gridPage === 0}
                      className="page-nav-button page-nav-button-left h-[40px] w-[40px] bg-white border-0 rounded-md disabled:cursor-not-allowed flex items-center justify-center"
                      style={{
                        color: gridPage === 0 ? '#d1d5db' : '#4242ea',
                        backgroundColor: '#ffffff',
                        marginRight: '5px'
                      }}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-[30px] h-[30px]" strokeWidth={1.5} />
                    </button>
                    <div className="text-base text-gray-700 w-32 text-center bg-white rounded-md border-0 h-10 px-[15px] flex items-center justify-center">
                      <span className="font-bold">P. {String(gridPage + 1).padStart(2, '0')}</span><span style={{marginLeft: 'calc(0.25em + 2px)', marginRight: '0.25em'}}>/</span>{String(Math.ceil(totalProjects / 8)).padStart(2, '0')}
                    </div>
                    <button
                      onClick={() => setGridPage(Math.min(Math.ceil(totalProjects / 8) - 1, gridPage + 1))}
                      disabled={gridPage >= Math.ceil(totalProjects / 8) - 1}
                      className="page-nav-button h-[40px] w-[40px] bg-white border-0 rounded-md disabled:cursor-not-allowed flex items-center justify-center"
                      style={{
                        color: gridPage >= Math.ceil(totalProjects / 8) - 1 ? '#d1d5db' : '#4242ea',
                        backgroundColor: '#ffffff',
                        marginLeft: '5px'
                      }}
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-[30px] h-[30px]" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
                {viewMode === 'people' && Math.ceil(totalProfiles / 8) > 1 && (
                  <div className="flex items-center">
                    <button
                      onClick={() => setGridPage(Math.max(0, gridPage - 1))}
                      disabled={gridPage === 0}
                      className="page-nav-button page-nav-button-left h-[40px] w-[40px] bg-white border-0 rounded-md disabled:cursor-not-allowed flex items-center justify-center"
                      style={{
                        color: gridPage === 0 ? '#d1d5db' : '#4242ea',
                        backgroundColor: '#ffffff',
                        marginRight: '5px'
                      }}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-[30px] h-[30px]" strokeWidth={1.5} />
                    </button>
                    <div className="text-base text-gray-700 w-28 text-center bg-white rounded-md border-0 h-10 px-[15px] flex items-center justify-center">
                      <span className="font-bold">P. {String(gridPage + 1).padStart(2, '0')}</span><span style={{marginLeft: 'calc(0.25em + 2px)', marginRight: '0.25em'}}>/</span>{String(Math.ceil(totalProfiles / 8)).padStart(2, '0')}
                    </div>
                    <button
                      onClick={() => setGridPage(Math.min(Math.ceil(totalProfiles / 8) - 1, gridPage + 1))}
                      disabled={gridPage >= Math.ceil(totalProfiles / 8) - 1}
                      className="page-nav-button h-[40px] w-[40px] bg-white border-0 rounded-md disabled:cursor-not-allowed flex items-center justify-center"
                      style={{
                        color: gridPage >= Math.ceil(totalProfiles / 8) - 1 ? '#d1d5db' : '#4242ea',
                        backgroundColor: '#ffffff',
                        marginLeft: '5px'
                      }}
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-[30px] h-[30px]" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </>
            )}
            {layoutView === 'list' && (
              <div className="h-10 flex items-center text-base font-semibold text-gray-700">
                {viewMode === 'people' ? filteredProfiles.length : filteredProjects.length} {viewMode === 'people' ? 'People' : 'Projects'}
              </div>
            )}
            {layoutView === 'detail' && currentLength > 1 && (
              <div className="flex items-center">
                <button
                  onClick={handlePrevious}
                  disabled={!canGoPrevious}
                  className="page-nav-button page-nav-button-left h-[40px] w-[40px] bg-white border-0 rounded-md disabled:cursor-not-allowed flex items-center justify-center"
                  style={{
                    color: !canGoPrevious ? '#d1d5db' : '#4242ea',
                    backgroundColor: '#ffffff',
                    marginRight: '5px'
                  }}
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-[30px] h-[30px]" strokeWidth={1.5} />
                </button>
                <div className="text-base text-gray-700 w-28 text-center bg-white rounded-md border-0 h-10 px-[15px] flex items-center justify-center">
                  <span className="font-bold">P. {String(currentIndex + 1).padStart(2, '0')}</span><span style={{marginLeft: 'calc(0.25em + 2px)', marginRight: '0.25em'}}>/</span>{String(currentLength).padStart(2, '0')}
                </div>
                <button
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="page-nav-button h-[40px] w-[40px] bg-white border-0 rounded-md disabled:cursor-not-allowed flex items-center justify-center"
                  style={{
                    color: !canGoNext ? '#d1d5db' : '#4242ea',
                    backgroundColor: '#ffffff',
                    marginLeft: '5px'
                  }}
                  aria-label="Next"
                >
                  <ChevronRight className="w-[30px] h-[30px]" strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>
          
          {/* Right side: Search and View Icons */}
          <div className="flex items-center gap-3 ml-auto justify-end">
            {layoutView === 'grid' && (
              <div className="relative">
                <Input
                  placeholder="Search"
                  value={viewMode === 'people' ? peopleFilters.search : projectFilters.search}
                  onChange={(e) => {
                    if (viewMode === 'people') {
                      setPeopleFilters({ ...peopleFilters, search: e.target.value });
                    } else {
                      setProjectFilters({ ...projectFilters, search: e.target.value });
                    }
                  }}
                  className="search-input w-48 xl:w-64 h-10 bg-white pr-14"
                />
                {(viewMode === 'people' ? peopleFilters.search : projectFilters.search) && (
                  <button
                    onClick={() => {
                      if (viewMode === 'people') {
                        setPeopleFilters({ ...peopleFilters, search: '' });
                      } else {
                        setProjectFilters({ ...projectFilters, search: '' });
                      }
                    }}
                    className="absolute right-[10px] top-1/2 -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 rounded-full border-[1.5px] border-white flex items-center justify-center search-clear-button transition-all"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3 lg:w-4 lg:h-4 text-white search-clear-icon" strokeWidth={2} />
                  </button>
                )}
              </div>
            )}
            {/* View Toggle Icons */}
            <div className="view-toggle-container flex items-center gap-1 bg-white rounded-md border h-10 relative" style={{padding: 0}}>
              <div 
                className="view-toggle-slider"
                style={{
                  transform: layoutView === 'grid' 
                    ? 'translateX(0)' 
                    : layoutView === 'detail' 
                    ? 'translateX(calc(2.5rem + 4px))' 
                    : 'translateX(calc(5rem + 8px))'
                }}
              />
              <button 
                className="rounded hover:bg-gray-100/50"
                data-active={layoutView === 'grid'}
                onClick={() => {
                  setLayoutView('grid');
                  if (viewMode === 'people') {
                    navigate('/people');
                  } else {
                    navigate('/projects');
                  }
                }}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button 
                className="rounded hover:bg-gray-100/50" 
                data-active={layoutView === 'detail'}
                onClick={() => {
                  if (!slug) {
                    if (viewMode === 'people' && filteredProfiles.length > 0) {
                      navigate(`/people/${filteredProfiles[0].slug}`);
                    } else if (viewMode === 'projects' && filteredProjects.length > 0) {
                      navigate(`/projects/${filteredProjects[0].slug}`);
                    }
                  } else {
                    setLayoutView('detail');
                  }
                }}
              >
                <Square className="w-4 h-4" />
              </button>
              <button 
                className="rounded hover:bg-gray-100/50"
                data-active={layoutView === 'list'}
                onClick={() => setLayoutView('list')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar - Floating - Slides in on mobile, always visible on desktop */}
      <div className={`fixed left-0 lg:left-5 top-0 lg:top-20 z-50 transition-transform duration-300 ${
mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } lg:block`}>
        <aside style={{backgroundColor: '#e3e3e3'}} className="w-72 lg:w-60 h-screen lg:h-auto lg:rounded-xl overflow-y-auto border-r-2 lg:border-2 border-white lg:max-h-[calc(100vh-10rem)] pt-14 lg:pt-4 pb-20 lg:pb-0">
          <div className="flex flex-col h-full">

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-0">
              {/* Tabs */}
              <div className="flex gap-1 border-b">
                <button
                  className={`flex-1 py-2 text-sm transition-colors ${
                    filterView === 'people' 
                      ? 'border-b-2 font-semibold' 
                      : 'text-gray-500 hover:text-gray-700 font-medium'
                  }`}
                  style={filterView === 'people' ? {color: '#4242ea', borderColor: '#4242ea'} : {}}
                  onClick={() => handleTabSwitch('people')}
                >
                  PEOPLE
                </button>
                <button
                  className={`flex-1 py-2 text-sm transition-colors ${
                    filterView === 'projects' 
                      ? 'border-b-2 font-semibold' 
                      : 'text-gray-500 hover:text-gray-700 font-medium'
                  }`}
                  style={filterView === 'projects' ? {color: '#4242ea', borderColor: '#4242ea'} : {}}
                  onClick={() => handleTabSwitch('projects')}
                >
                  PROJECTS
                </button>
              </div>

              {/* People Filters */}
              {filterView === 'people' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm">Skills</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {availablePeopleFilters.skills.length > 0 ? (
                        availablePeopleFilters.skills.map(skill => (
                        <div key={skill} className="flex items-center space-x-2">
                          <Checkbox
                            id={`skill-${skill}`}
                            checked={peopleFilters.skills.includes(skill)}
                            onCheckedChange={(checked) => {
                              const newSkills = checked
                                ? [...peopleFilters.skills, skill]
                                : peopleFilters.skills.filter(s => s !== skill);
                              
                              setPeopleFilters({
                                ...peopleFilters,
                                skills: newSkills
                              });
                              
                              // Track filter application
                              analytics.filterApplied('skill', skill, 'people');
                            }}
                          />
                          <label htmlFor={`skill-${skill}`} className="text-sm cursor-pointer" style={{fontWeight: 400}}>
                            {skill}
                          </label>
                        </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500">Loading skills...</p>
                      )}
                    </div>
                  </div>

                  <Separator className="bg-white" />

                  <div className="space-y-2">
                    <h4 className="text-sm">Industries</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {availablePeopleFilters.industries.length > 0 ? (
                        availablePeopleFilters.industries.map(industry => (
                        <div key={industry} className="flex items-center space-x-2">
                          <Checkbox
                            id={`industry-${industry}`}
                            checked={peopleFilters.industries.includes(industry)}
                            onCheckedChange={(checked) => {
                              const newIndustries = checked
                                ? [...peopleFilters.industries, industry]
                                : peopleFilters.industries.filter(i => i !== industry);
                              
                              setPeopleFilters({
                                ...peopleFilters,
                                industries: newIndustries
                              });
                              
                              // Track filter application
                              analytics.filterApplied('industry', industry, 'people');
                            }}
                          />
                          <label htmlFor={`industry-${industry}`} className="text-sm cursor-pointer" style={{fontWeight: 400}}>
                            {industry}
                          </label>
                        </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500">Loading industries...</p>
                      )}
                    </div>
                  </div>

                  {/* TEMPORARILY HIDDEN - Additional Filters
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="has-demo-video" />
                      <label htmlFor="has-demo-video" className="text-sm cursor-pointer" style={{fontWeight: 400}}>
                        Has Demo Video
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="open-to-relocate" />
                      <label htmlFor="open-to-relocate" className="text-sm cursor-pointer" style={{fontWeight: 400}}>
                        Open to Relocate
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="open-to-work" />
                      <label htmlFor="open-to-work" className="text-sm cursor-pointer" style={{fontWeight: 400}}>
                        Open to Work
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="freelance" />
                      <label htmlFor="freelance" className="text-sm cursor-pointer" style={{fontWeight: 400}}>
                        Freelance
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="nyc-based" />
                      <label htmlFor="nyc-based" className="text-sm cursor-pointer" style={{fontWeight: 400}}>
                        NYC-based
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remote-only" />
                      <label htmlFor="remote-only" className="text-sm cursor-pointer" style={{fontWeight: 400}}>
                        Remote Only
                      </label>
                    </div>
                  </div>
                  */}
                </div>
              )}

              {/* Project Filters */}
              {filterView === 'projects' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm">Technologies</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {availableProjectFilters.skills.map(skill => (
                        <div key={skill} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`proj-skill-${skill}`}
                            checked={projectFilters.skills.includes(skill)}
                            onCheckedChange={(checked) => {
                              const newSkills = checked
                                ? [...projectFilters.skills, skill]
                                : projectFilters.skills.filter(s => s !== skill);
                              
                              setProjectFilters({
                                ...projectFilters,
                                skills: newSkills
                              });
                              
                              // Track filter application
                              analytics.filterApplied('skill', skill, 'projects');
                            }}
                          />
                          <Label htmlFor={`proj-skill-${skill}`} className="text-sm cursor-pointer">
                            {skill}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-white" />

                  <div className="space-y-2">
                    <h4 className="text-sm">Industries</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {availableProjectFilters.sectors.map(sector => (
                        <div key={sector} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`proj-sector-${sector}`}
                            checked={projectFilters.sectors.includes(sector)}
                            onCheckedChange={(checked) => {
                              const newSectors = checked
                                ? [...projectFilters.sectors, sector]
                                : projectFilters.sectors.filter(s => s !== sector);
                              
                              setProjectFilters({
                                ...projectFilters,
                                sectors: newSectors
                              });
                              
                              // Track filter application
                              analytics.filterApplied('sector', sector, 'projects');
                            }}
                          />
                          <Label htmlFor={`proj-sector-${sector}`} className="text-sm cursor-pointer">
                            {sector}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Contact Section */}
              <Separator className="bg-white" />
              <div className="space-y-1">
                <p className="text-sm font-bold">Contact for Resume / Hiring Interest</p>
                <p className="text-sm font-semibold">Devika Gopal Agge</p>
                <p className="text-sm">devika@pursuit.org</p>
              </div>
            </div>
        </div>
      </aside>

        {/* Footer under sidebar */}
        <div className="w-60 text-center text-xs text-gray-600 mt-2">
          Built with ♥ by Pursuit + AI
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 mt-16 lg:mt-20 mx-2 lg:ml-[260px] lg:mr-2" style={{width: '100%', maxWidth: '100%', overflowX: 'hidden'}}>
        <div className="relative pt-0 pb-4" style={{marginLeft: 0, marginRight: 0, paddingLeft: '2rem', paddingRight: '1rem', width: '100%', maxWidth: '100%', overflowX: 'hidden'}}>
          
          {/* Grid View */}
          {layoutView === 'grid' && viewMode === 'projects' && (
            <>
              {!gridListLoading && totalProjects === 0 ? (
                <div className="flex flex-col items-center justify-center" style={{minHeight: 'calc(100vh - 12rem)', gap: '1rem'}}>
                  <Frown className="text-[#4242ea] error-icon" style={{width: '3rem', height: '3rem'}} strokeWidth={1.5} stroke="#4242ea" />
                  <p className="text-[#4242ea] uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem', fontWeight: 400}}>
                    Sorry! Can't find any projects
                  </p>
                  <button
                    style={{marginTop: '1rem'}}
                    onClick={() => {
                      setProjectFilters({ search: '', skills: [], sectors: [] });
                    }}
                    className="page-nav-button h-10 px-6 rounded-full border-[1.5px] border-[#4242ea] bg-[#e3e3e3] text-[#4242ea] transition-all"
                  >
                    <span className="relative z-10">Clear Search</span>
                  </button>
                </div>
              ) : (
                <div 
                  key={`projects-grid-${gridPage}`}
                  className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-[18px] mb-0" 
                  style={{
                  animation: 'fadeIn 0.3s ease-in-out',
                  gridAutoRows: 'auto',
                  overflow: 'visible'
                  }}
                >
                  {/* In grid view, API already returns paginated data, so display directly */}
                  {allProjects.map((proj, idx) => (
                    <MemoizedProjectCard 
                      key={proj.slug}
                      proj={proj}
                      onClick={() => {
                        setLayoutView('detail');
                        navigate(`/projects/${proj.slug}`);
                      }}
                    />
                  ))}
                </div>
              )}

            {/* Mobile Navigation - Bottom Fixed for Projects Grid */}
            {Math.ceil(totalProjects / 8) > 1 && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white z-50 px-4 py-3 flex items-center justify-center shadow-lg">
                    <button
                      onClick={() => setGridPage(Math.max(0, gridPage - 1))}
                      disabled={gridPage === 0}
                      className="page-nav-button page-nav-button-left h-[40px] w-[40px] bg-white border-0 rounded-md disabled:cursor-not-allowed flex items-center justify-center"
                      style={{
                        color: gridPage === 0 ? '#d1d5db' : '#4242ea',
                        backgroundColor: '#ffffff',
                        marginRight: '5px'
                      }}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-[30px] h-[30px]" strokeWidth={1.5} />
              </button>
              
              <div className="text-base text-gray-700 w-28 text-center bg-white rounded-md border-0 h-10 px-[15px] flex items-center justify-center">
                <span className="font-bold">P. {String(gridPage + 1).padStart(2, '0')}</span><span style={{marginLeft: 'calc(0.25em + 2px)', marginRight: '0.25em'}}>/</span>{String(Math.ceil(totalProjects / 8)).padStart(2, '0')}
              </div>

              <button
                onClick={() => setGridPage(Math.min(Math.ceil(totalProjects / 8) - 1, gridPage + 1))}
                disabled={gridPage >= Math.ceil(totalProjects / 8) - 1}
                className="page-nav-button h-[40px] w-[40px] bg-white border-0 rounded-md disabled:cursor-not-allowed flex items-center justify-center"
                style={{
                  color: gridPage >= Math.ceil(totalProjects / 8) - 1 ? '#d1d5db' : '#4242ea',
                  backgroundColor: '#ffffff',
                  marginLeft: '5px'
                }}
                aria-label="Next page"
              >
                <ChevronRight className="w-[30px] h-[30px]" strokeWidth={1.5} />
              </button>
            </div>
            )}
            </>
          )}

          {/* People Grid View */}
          {layoutView === 'grid' && viewMode === 'people' && (
            <>
              {!gridListLoading && totalProfiles === 0 ? (
                <div className="flex flex-col items-center justify-center" style={{minHeight: 'calc(100vh - 12rem)', gap: '1rem'}}>
                  <Frown className="text-[#4242ea] error-icon" style={{width: '3rem', height: '3rem'}} strokeWidth={1.5} stroke="#4242ea" />
                  <p className="text-[#4242ea] uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem', fontWeight: 400}}>
                    Sorry! Can't find anyone
                  </p>
                  <button
                    style={{marginTop: '1rem'}}
                    onClick={() => {
                      setPeopleFilters({ search: '', skills: [], industries: [], openToWork: false });
                    }}
                    className="page-nav-button h-10 px-6 rounded-full border-[1.5px] border-[#4242ea] bg-[#e3e3e3] text-[#4242ea] transition-all"
                  >
                    <span className="relative z-10">Clear Search</span>
                  </button>
                </div>
              ) : (
                <div 
                  key={`people-grid-${gridPage}`}
                  className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-[18px] mb-0" 
                  style={{
                  animation: 'fadeIn 0.3s ease-in-out',
                  gridAutoRows: 'auto',
                  overflow: 'visible'
                  }}
                >
                  {/* In grid view, API already returns paginated data, so display directly */}
                  {allProfiles.map((prof, idx) => (
                    <MemoizedProfileCard 
                      key={prof.slug}
                      prof={prof}
                      onClick={() => {
                        setLayoutView('detail');
                        navigate(`/people/${prof.slug}`);
                      }}
                    />
                  ))}
                </div>
              )}

            {/* Mobile Navigation - Bottom Fixed for People Grid */}
            {Math.ceil(totalProfiles / 8) > 1 && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white z-50 px-4 py-3 flex items-center justify-center shadow-lg">
                    <button
                      onClick={() => setGridPage(Math.max(0, gridPage - 1))}
                      disabled={gridPage === 0}
                      className="page-nav-button page-nav-button-left h-[40px] w-[40px] bg-white border-0 rounded-md disabled:cursor-not-allowed flex items-center justify-center"
                      style={{
                        color: gridPage === 0 ? '#d1d5db' : '#4242ea',
                        backgroundColor: '#ffffff',
                        marginRight: '5px'
                      }}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-[30px] h-[30px]" strokeWidth={1.5} />
              </button>
              
              <div className="text-base text-gray-700 w-28 text-center bg-white rounded-md border-0 h-10 px-[15px] flex items-center justify-center">
                <span className="font-bold">P. {String(gridPage + 1).padStart(2, '0')}</span><span style={{marginLeft: 'calc(0.25em + 2px)', marginRight: '0.25em'}}>/</span>{String(Math.ceil(totalProfiles / 8)).padStart(2, '0')}
              </div>

              <button
                onClick={() => setGridPage(Math.min(Math.ceil(totalProfiles / 8) - 1, gridPage + 1))}
                disabled={gridPage >= Math.ceil(totalProfiles / 8) - 1}
                className="page-nav-button h-[40px] w-[40px] bg-white border-0 rounded-md disabled:cursor-not-allowed flex items-center justify-center"
                style={{
                  color: gridPage >= Math.ceil(totalProfiles / 8) - 1 ? '#d1d5db' : '#4242ea',
                  backgroundColor: '#ffffff',
                  marginLeft: '5px'
                }}
                aria-label="Next page"
              >
                <ChevronRight className="w-[30px] h-[30px]" strokeWidth={1.5} />
              </button>
            </div>
            )}
            </>
          )}

          {/* List View */}
          {layoutView === 'list' && (
            <>
              {!gridListLoading && viewMode === 'projects' && filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center" style={{minHeight: 'calc(100vh - 12rem)', gap: '1rem'}}>
                  <Frown className="text-[#4242ea] error-icon" style={{width: '3rem', height: '3rem'}} strokeWidth={1.5} stroke="#4242ea" />
                  <p className="text-[#4242ea] uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem', fontWeight: 400}}>
                    Sorry! Can't find any projects
                  </p>
                  <button
                    style={{marginTop: '1rem'}}
                    onClick={() => {
                      setProjectFilters({ search: '', skills: [], sectors: [] });
                    }}
                    className="page-nav-button h-10 px-6 rounded-full border-[1.5px] border-[#4242ea] bg-[#e3e3e3] text-[#4242ea] transition-all"
                  >
                    <span className="relative z-10">Clear Search</span>
                  </button>
                </div>
              ) : !gridListLoading && viewMode === 'people' && filteredProfiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center" style={{minHeight: 'calc(100vh - 12rem)', gap: '1rem'}}>
                  <Frown className="text-[#4242ea] error-icon" style={{width: '3rem', height: '3rem'}} strokeWidth={1.5} stroke="#4242ea" />
                  <p className="text-[#4242ea] uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem', fontWeight: 400}}>
                    Sorry! Can't find anyone
                  </p>
                  <button
                    style={{marginTop: '1rem'}}
                    onClick={() => {
                      setPeopleFilters({ search: '', skills: [], industries: [], openToWork: false });
                    }}
                    className="page-nav-button h-10 px-6 rounded-full border-[1.5px] border-[#4242ea] bg-[#e3e3e3] text-[#4242ea] transition-all"
                  >
                    <span className="relative z-10">Clear Search</span>
                  </button>
                </div>
              ) : (
            <Card className="rounded-xl border-2 border-white shadow-none mb-12" style={{
              backgroundColor: 'white',
              animation: 'fadeInList 0.3s ease-in-out',
            }}>
              <CardContent className="p-6">
                {viewMode === 'projects' && (
                  <div>
                    {filteredProjects.map((proj, index) => (
                      <div key={proj.slug}>
                        {index > 0 && <div className="border-t border-gray-200 my-0"></div>}
                        <div 
                          onClick={() => {
                            setLayoutView('detail');
                            navigate(`/projects/${proj.slug}`);
                          }}
                          className="flex items-center gap-6 p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                        {/* Project Icon/Image */}
                        <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-orange-500 to-red-500">
                          {(proj.icon_url || proj.main_image_url) ? (
                            <img 
                              src={getImageUrl((() => {
                                // Use icon_url if available, otherwise use main_image_url
                                const imageUrl = proj.icon_url || proj.main_image_url;
                                try {
                                  const images = JSON.parse(imageUrl);
                                  if (Array.isArray(images)) {
                                    return typeof images[0] === 'string' ? images[0] : images[0].url;
                                  }
                                } catch {}
                                return imageUrl;
                              })())}
                              alt={proj.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                              {proj.title?.charAt(0)}
                            </div>
                          )}
                        </div>

                        {/* Project Name and Description */}
                        <div className="flex-1 min-w-0" style={{maxWidth: '550px'}}>
                          <h3 className="font-bold text-lg uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif"}}>
                            {proj.title}
                          </h3>
                          {proj.short_description && (
                            <p className="text-gray-600 mb-2" style={{fontSize: '14px'}}>
                              {proj.short_description}
                            </p>
                          )}
                          {/* Industry Pills */}
                          <div className="flex gap-2 flex-wrap">
                            {proj.sectors && proj.sectors.slice(0, 2).map((sector, i) => (
                              <span 
                                key={i} 
                                className="text-xs px-2 py-1 rounded-full bg-purple-600 text-white font-semibold uppercase"
                              >
                                {sector}
                              </span>
                            ))}
                            {proj.sectors && proj.sectors.length > 2 && (
                              <span 
                                className="text-xs px-2 py-1 rounded-full bg-gray-400 text-white font-semibold"
                              >
                                +{proj.sectors.length - 2}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Project Team */}
                        <div className="w-48 flex-shrink-0 ml-14">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Project Team</h4>
                          {proj.participants && proj.participants.length > 0 ? (
                            <div className="space-y-2">
                              {proj.participants.map((participant, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div 
                                    className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                    title={participant.name || participant}
                                  >
                                    {(participant.photo_url || participant.photoUrl) ? (
                                      <img 
                                        src={getImageUrl(participant.photo_url || participant.photoUrl)}
                                        alt={participant.name || participant}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span>{(participant.name || participant).split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}</span>
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-700 truncate">{participant.name || participant}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No team listed</p>
                          )}
                        </div>
                      </div>
                      </div>
                    ))}
                  </div>
                )}
                {viewMode === 'people' && (
                  <div>
                    {filteredProfiles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-4" style={{minHeight: 'calc(100vh - 12rem)'}}>
                        <p className="text-[#4242ea] uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem', fontWeight: 400, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          Sorry! Can't find anyone
                          <Frown className="text-[#4242ea]" style={{width: '1.5rem', height: '1.5rem'}} strokeWidth={1.5} />
                        </p>
                        <button
                          onClick={() => {
                            setPeopleFilters({ ...peopleFilters, search: '' });
                          }}
                          className="h-10 px-6 rounded-full bg-[#4242ea] text-white font-semibold hover:opacity-90 transition-opacity"
                          style={{fontFamily: "'Galano Grotesque', sans-serif"}}
                        >
                          Clear Search
                        </button>
                      </div>
                    ) : (
                      filteredProfiles.map((prof, index) => (
                      <div key={prof.slug}>
                        {index > 0 && <div className="border-t border-gray-200 my-0"></div>}
                        <div 
                          onClick={() => {
                            setLayoutView('detail');
                            navigate(`/people/${prof.slug}`);
                          }}
                          className="flex items-start gap-6 p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          {/* Profile Photo */}
                          <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0">
                            {(prof.photo_url || prof.photoUrl) ? (
                              <img 
                                src={getImageUrl(prof.photo_url || prof.photoUrl)}
                                alt={prof.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                                {prof.name?.split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}
                              </div>
                            )}
                          </div>

                          {/* Name and Bio */}
                          <div className="flex-1 min-w-0" style={{maxWidth: '550px'}}>
                            <h3 className="font-bold text-lg uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif"}}>
                              {prof.name}
                            </h3>
                            {prof.title && (
                              <p className="text-sm text-gray-700 mb-1" style={{fontWeight: '500'}}>
                                {prof.title}
                              </p>
                            )}
                            {prof.bio && (
                              <p className="text-gray-600 mb-2 line-clamp-2" style={{fontSize: '14px'}}>
                                {prof.bio}
                              </p>
                            )}
                            {/* Skills/Industries Pills */}
                            <div className="flex gap-2 flex-wrap">
                              {prof.skills && prof.skills.slice(0, 3).map((skill, i) => (
                                <span 
                                  key={i} 
                                  className="text-xs px-2 py-1 rounded-full bg-blue-600 text-white font-semibold"
                                >
                                  {skill}
                                </span>
                              ))}
                              {prof.skills && prof.skills.length > 3 && (
                                <span 
                                  className="text-xs px-2 py-1 rounded-full bg-gray-400 text-white font-semibold"
                                >
                                  +{prof.skills.length - 3}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Industries/Status */}
                          <div className="w-48 flex-shrink-0 ml-14">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Industry Expertise</h4>
                            {prof.industry_expertise && prof.industry_expertise.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {prof.industry_expertise.slice(0, 3).map((industry, i) => (
                                  <span 
                                    key={i} 
                                    className="text-xs px-2 py-1 rounded-full bg-purple-600 text-white font-semibold uppercase"
                                  >
                                    {industry}
                                  </span>
                                ))}
                                {prof.industry_expertise.length > 3 && (
                                  <span 
                                    className="text-xs px-2 py-1 rounded-full bg-gray-400 text-white font-semibold"
                                  >
                                    +{prof.industry_expertise.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">No industries listed</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )))}
                  </div>
                )}
              </CardContent>
            </Card>
              )}
            </>
          )}

          {/* Detail View */}
          {layoutView === 'detail' && (
            <>
          {/* Mobile Navigation - Bottom Fixed */}
          {currentLength > 1 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-4 py-3 flex items-center justify-center shadow-lg">
            <button
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              className="page-nav-button page-nav-button-left h-[40px] w-[40px] bg-white border-0 rounded-md disabled:cursor-not-allowed flex items-center justify-center"
              style={{
                color: !canGoPrevious ? '#d1d5db' : '#4242ea',
                backgroundColor: '#ffffff',
                marginRight: '5px'
              }}
              aria-label="Previous"
            >
              <ChevronLeft className="w-[30px] h-[30px]" strokeWidth={1.5} />
            </button>
            
            <div className="text-base text-gray-700 w-28 text-center bg-white rounded-md border-0 h-10 px-[15px] flex items-center justify-center">
              <span className="font-bold">P. {String(currentIndex + 1).padStart(2, '0')}</span><span style={{marginLeft: 'calc(0.25em + 2px)', marginRight: '0.25em'}}>/</span>{String(currentLength).padStart(2, '0')}
            </div>

            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className="page-nav-button h-[40px] w-[40px] bg-white border-0 rounded-md disabled:cursor-not-allowed flex items-center justify-center"
              style={{
                color: !canGoNext ? '#d1d5db' : '#4242ea',
                backgroundColor: '#ffffff',
                marginLeft: '5px'
              }}
              aria-label="Next"
            >
              <ChevronRight className="w-[30px] h-[30px]" strokeWidth={1.5} />
            </button>
          </div>
          )}

          <Card className="rounded-xl border-2 border-white shadow-none mb-12 md:mb-12" style={{
            backgroundColor: 'white', 
            minHeight: '800px',
            marginBottom: 'calc(3rem + 70px)', // Extra space for mobile nav on mobile
            animation: 'fadeIn 0.3s ease-in-out',
          }}>
            <CardContent className="p-4 md:p-6">
              {/* Render Person or Project based on viewMode */}
              {viewMode === 'people' && person && (
              <>
              {/* Header with Photo and Name */}
              <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
                {/* Profile Photo Card and Highlights */}
                <div className="flex-shrink-0 w-full md:w-60">
                  <div className="rounded-lg overflow-hidden mb-4" style={{height: '270px'}}>
                    {(person.photo_url || person.photoUrl) ? (
                      <img 
                        src={getImageUrl(person.photo_url || person.photoUrl)} 
                        alt={person.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-6xl">
                        {initials}
                      </div>
                    )}
                  </div>
                  
                  {/* Highlights */}
                  {person.highlights && person.highlights.length > 0 && (
                    <Card className="bg-black border-black">
                      <CardContent className="p-4">
                        <h3 className="font-bold text-sm mb-3 text-white">Highlights</h3>
                        <div className="space-y-3">
                          {person.highlights.map((highlight, idx) => (
                            <div key={idx} className="flex gap-3 items-start">
                              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                                ✓
                              </div>
                              <p className="text-base text-white leading-snug" style={{fontSize: '14px'}}>{highlight}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                {/* Name and Info */}
                <div className="flex-1 w-full md:w-auto pt-0 md:pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
                        <h1 className="font-bold uppercase tracking-tight text-2xl md:text-3xl" style={{fontFamily: "'Galano Grotesque', sans-serif"}}>{person.name}</h1>
                        {person.title && (
                          <p className="text-base md:text-lg text-gray-600">{person.title}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {person.linkedin_url && (
                        <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Button size="icon" style={{ backgroundColor: '#0A66C2', color: 'white' }} className="hover:opacity-90">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                          </Button>
                        </a>
                      )}
                      {person.github_url && (
                        <a href={person.github_url} target="_blank" rel="noopener noreferrer">
                          <Button size="icon" style={{ backgroundColor: '#181717', color: 'white' }} className="hover:opacity-90">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                          </Button>
                        </a>
                      )}
                      {person.x_url && (
                        <a href={person.x_url.startsWith('http') ? person.x_url : `https://x.com/${person.x_url.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                          <Button size="icon" style={{ backgroundColor: '#000000', color: 'white' }} className="hover:opacity-90">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                          </Button>
                        </a>
                      )}
                      {person.website_url && (
                        <a href={person.website_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="icon" className="bg-white hover:bg-gray-200">
                            <Globe className="h-4 w-4 text-black" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {/* Bio & Credentials */}
                  {person.bio && (
                    <div className="mb-4 pb-4 border-b">
                      <h2 className="text-lg font-bold mb-2">Bio & Credentials</h2>
                      <p className="text-gray-700 leading-snug" style={{fontSize: '16px'}}>{person.bio}</p>
                    </div>
                  )}

                  {/* Select Projects - Before Experience Section */}
                  {person.projects && person.projects.length > 0 && (
                    <div className="mb-4 pb-4 border-b">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-bold">Select Projects</h3>
                        {filteredPersonProjects.length > 3 && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setProjectCarouselIndex(Math.max(0, projectCarouselIndex - 3))}
                              disabled={projectCarouselIndex === 0}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const maxIndex = Math.floor((filteredPersonProjects.length - 1) / 3) * 3;
                                setProjectCarouselIndex(Math.min(maxIndex, projectCarouselIndex + 3));
                              }}
                              disabled={projectCarouselIndex >= Math.floor((filteredPersonProjects.length - 1) / 3) * 3}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {filteredPersonProjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8" style={{gap: '1rem'}}>
                          <Frown className="text-[#4242ea] error-icon" style={{width: '3rem', height: '3rem'}} strokeWidth={1.5} stroke="#4242ea" />
                          <p className="text-[#4242ea] uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem', fontWeight: 400}}>
                            Sorry! Can't find any projects
                          </p>
                          <button
                            style={{marginTop: '1rem'}}
                            onClick={() => {
                              setProjectFilters({ search: '', skills: [], sectors: [] });
                            }}
                            className="page-nav-button h-10 px-6 rounded-full border-[1.5px] border-[#4242ea] bg-[#e3e3e3] text-[#4242ea] transition-all"
                          >
                            <span className="relative z-10">Clear Search</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-3">
                          {filteredPersonProjects.slice(projectCarouselIndex, projectCarouselIndex + 3).map((project, idx) => {
                          // Cycle through different icons for variety (fallback if no image)
                          const icons = [Camera, Code, Rocket, Zap, Lightbulb, Target];
                          const Icon = icons[(projectCarouselIndex + idx) % icons.length];
                          
                          // Check if project has main_image_url (prioritize this) or icon_url
                          const hasProjectImage = project.mainImageUrl || project.main_image_url || project.icon_url;
                          const imageUrl = project.mainImageUrl || project.main_image_url || project.icon_url;
                          
                          return (
                            <div key={idx} className="flex gap-3 items-start">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white flex-shrink-0 overflow-hidden">
                                {hasProjectImage ? (
                                  <img
                                    src={getImageUrl((() => {
                                      try {
                                        // If it's a JSON string with array of images, get the first one
                                        const images = JSON.parse(imageUrl);
                                        if (Array.isArray(images) && images.length > 0) {
                                          return typeof images[0] === 'string' ? images[0] : images[0].url;
                                        }
                                      } catch {
                                        // If not JSON, use the URL as-is
                                      }
                                      return imageUrl;
                                    })())}
                                    alt={project.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                <Icon className="w-6 h-6" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-base mb-1">{project.title}</h4>
                                {(project.short_description || project.summary) && (
                                  <p className="text-gray-600 leading-snug mb-2" style={{fontSize: '16px'}}>{project.short_description || project.summary}</p>
                                )}
                                <button
                                  onClick={() => {
                                    setViewMode('projects');
                                    navigate(`/projects/${project.slug}`);
                                  }}
                                  className="text-sm inline-flex items-center gap-1 hover:underline cursor-pointer"
                                  style={{color: '#4242ea'}}
                                >
                                  Learn More →
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      )}
                    </div>
                  )}

                  {/* Three Column Layout - Experience, Skills, Industry Expertise */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 pt-2">
                    {/* Experience & Education */}
                    <div>
                      <h3 className="text-lg font-bold mb-3">Experience & Education</h3>
                      {person.experience && person.experience.length > 0 ? (
                        <div className="space-y-3">
                          {person.experience.map((exp, idx) => (
                            <div key={idx} className="flex gap-3 items-start">
                              <div className="w-10 h-10 rounded-lg bg-gray-100 border flex items-center justify-center flex-shrink-0 font-bold text-lg" style={{color: '#4242ea'}}>
                                {exp.org?.charAt(0) || '📄'}
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold" style={{fontSize: '16px'}}>{exp.role}</div>
                                <div className="text-gray-600" style={{fontSize: '16px'}}>{exp.org}</div>
                                {(exp.dateFrom || exp.dateTo) && (
                                  <div className="text-gray-500 mt-0.5" style={{fontSize: '16px'}}>
                                    {exp.dateFrom} - {exp.dateTo || 'Present'}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-base">No experience listed</p>
                      )}
                    </div>

                  {/* Skills */}
                  <div>
                    <h3 className="text-lg font-bold mb-3">Skills</h3>
                      {person.skills && person.skills.length > 0 ? (
                        <ul className={`space-y-1 ${person.skills.length > 7 ? 'grid grid-cols-2 gap-x-4' : ''}`}>
                          {person.skills.slice(0, 14).map((skill, idx) => (
                            <li key={idx} className="text-gray-700" style={{fontSize: '14px'}}>
                              • {skill}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-base">No skills listed</p>
                      )}
                    </div>

                  {/* Industry Expertise */}
                  <div>
                    <h3 className="text-lg font-bold mb-3">Industry Expertise</h3>
                      {person.industry_expertise && person.industry_expertise.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {person.industry_expertise.map((industry, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 rounded-full bg-purple-600 text-white font-semibold uppercase">
                              {industry}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-base">No industry expertise listed</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </>
              )}

              {/* Project View */}
              {viewMode === 'projects' && project && (
              <>
              <div className="mb-6">
                {/* Project Info */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4">
                    <div>
                      <h1 className="font-bold uppercase tracking-tight mb-2 text-2xl md:text-3xl" style={{fontFamily: "'Galano Grotesque', sans-serif"}}>{project.title}</h1>
                      
                      {/* Project Partner Section */}
                      {project.has_partner && (project.partner_logo_url || project.partner_name) && (
                        <div className="mt-6 mb-2">
                          {project.partner_logo_url ? (
                            <>
                              <div className="mb-2">
                                <img 
                                  src={getImageUrl(project.partner_logo_url)} 
                                  alt={project.partner_name || 'Partner logo'} 
                                  className="max-h-12 object-contain"
                                  style={{ maxWidth: '180px' }}
                                />
                              </div>
                              <div className="text-xs text-gray-600 uppercase tracking-wide">
                                <span className="font-bold">Project Partner</span>
                                {project.partner_name && (
                                  <span className="ml-2">{project.partner_name}</span>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="mb-2">
                                <div className="text-2xl font-bold text-gray-900">
                                  {project.partner_name}
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 uppercase tracking-wide font-bold">
                                Project Partner
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {project.github_url && (
                        <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="icon">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                          </Button>
                        </a>
                      )}
                      {project.live_url && (
                        <a href={project.live_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="icon" className="bg-white hover:bg-gray-200">
                            <Globe className="h-4 w-4 text-black" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {/* Project Summary */}
                  {project.summary && (
                    <div className="mb-6 pb-6 border-b">
                      <h2 className="text-lg font-bold mb-2">About</h2>
                      <div className="md:max-w-[75%]">
                        {project.summary.split('\n').filter(para => para.trim()).map((paragraph, idx) => (
                          <p key={idx} className="text-gray-700 leading-snug mb-4" style={{fontSize: '16px'}}>
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Two Column Layout - Skills and Team */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pt-2">
                    {/* Skills */}
                    <div>
                      <h3 className="text-base font-bold mb-3">Technologies</h3>
                      {project.skills && project.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {project.skills.map((skill, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 rounded-full bg-blue-600 text-white font-semibold">
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-base">No technologies listed</p>
                      )}
                    </div>

                    {/* Team */}
                    <div>
                      <h3 className="text-base font-bold mb-3">Team</h3>
                      {project.participants && project.participants.length > 0 ? (
                        <div className="space-y-2">
                          {project.participants.map((participant, idx) => (
                                     <div key={idx} className="flex items-center gap-2 text-gray-700" style={{fontSize: '16px'}}>
                                       <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                                {participant.photoUrl ? (
                                  <img 
                                    src={getImageUrl(participant.photoUrl)} 
                                    alt={participant.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                    {participant.name?.charAt(0) || '?'}
                                  </div>
                                )}
                              </div>
                              {participant.slug ? (
                                <button 
                                  onClick={() => {
                                    setViewMode('people');
                                    setFilterView('people');
                                    navigate(`/people/${participant.slug}`);
                                  }}
                                  className="hover:underline cursor-pointer"
                                  style={{color: '#4242ea'}}
                                >
                                  {participant.name || participant}
                                </button>
                              ) : (
                                <span>{participant.name || participant}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-base">No team members listed</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Screenshot Section */}
                {project.main_image_url && (
                  <div className="mb-6">
                    <h3 className="text-base font-bold mb-3">Screenshot{(() => {
                      try {
                        const images = JSON.parse(project.main_image_url);
                        return Array.isArray(images) && images.length > 1 ? 's' : '';
                      } catch {
                        return '';
                      }
                    })()}</h3>
                    <div className="space-y-6">
                      {(() => {
                        try {
                          // Try to parse as JSON array
                          const images = JSON.parse(project.main_image_url);
                          if (Array.isArray(images)) {
                            return images.map((image, idx) => (
                              <div key={idx}>
                                <div className="rounded-lg overflow-hidden">
                                  <img 
                                    src={typeof image === 'string' ? image : image.url}
                                    alt={`${project.title} screenshot ${idx + 1}`}
                                    className="w-full h-auto"
                                  />
                                </div>
                                {typeof image === 'object' && image.description && (
                                  <p className="mt-12 mb-12 text-gray-700 leading-relaxed" style={{fontSize: '16px', maxWidth: '75%'}}>{image.description}</p>
                                )}
                              </div>
                            ));
                          }
                        } catch {
                          // If not JSON, treat as single URL
                        }
                        // Single image
                        return (
                          <div className="rounded-lg overflow-hidden">
                            <img 
                              src={getImageUrl(project.main_image_url)} 
                              alt={`${project.title} screenshot`}
                              className="w-full h-auto"
                            />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
                
                {/* Demo Video if available */}
                {project.demo_video_url && (
                  <div className="mb-6">
                    <h3 className="text-base font-bold mb-3">Demo Video{(() => {
                      try {
                        const videos = JSON.parse(project.demo_video_url);
                        return Array.isArray(videos) && videos.length > 1 ? 's' : '';
                      } catch {
                        return '';
                      }
                    })()}</h3>
                    <div className="space-y-6">
                      {(() => {
                        try {
                          // Try to parse as JSON array
                          const videos = JSON.parse(project.demo_video_url);
                          if (Array.isArray(videos)) {
                            return videos.map((video, idx) => (
                              <div key={idx}>
                                <LazyVideo
                                  src={getEmbedUrl(typeof video === 'string' ? video : video.url)}
                                  title={`Demo Video ${idx + 1}`}
                                  className="rounded-lg overflow-hidden"
                                  style={{position: 'relative', paddingBottom: '56.25%', height: 0}}
                                />
                                {typeof video === 'object' && video.description && (
                                  <p className="mt-12 mb-12 text-gray-700 leading-snug" style={{fontSize: '16px', maxWidth: '75%'}}>{video.description}</p>
                                )}
                                {typeof video === 'object' && video.screenshot_after && (
                                  <div className="mt-6 rounded-lg overflow-hidden">
                                    <img 
                                      src={video.screenshot_after}
                                      alt={`${project.title} screenshot`}
                                      className="w-full h-auto"
                                    />
                                  </div>
                                )}
                              </div>
                            ));
                          }
                        } catch {
                          // If not JSON, treat as single URL
                        }
                        // Single video
                        return (
                          <LazyVideo
                            src={getEmbedUrl(project.demo_video_url)}
                            title="Demo Video"
                            className="rounded-lg overflow-hidden"
                            style={{position: 'relative', paddingBottom: '56.25%', height: 0}}
                          />
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
              </>
              )}
            </CardContent>
          </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PersonDetailPage;
