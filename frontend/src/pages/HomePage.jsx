import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, ArrowRight } from 'lucide-react';
import { projectsAPI, profilesAPI, getImageUrl } from '../utils/api';

function HomePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [visibleProfiles, setVisibleProfiles] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [projectImages, setProjectImages] = useState([]);
  const [isImageInitialLoad, setIsImageInitialLoad] = useState(true);
  const [visibleProjects, setVisibleProjects] = useState([]);
  const peopleCardRef = useRef(null);
  const projectsCardRef = useRef(null);

  // Fetch projects on mount
  useEffect(() => {
    let timeoutId;
    const fetchProjects = async () => {
      try {
        const data = await projectsAPI.getAll({ limit: 30 });
        if (data.success) {
          setProjects(data.data);
          // Initialize with first 5 projects for display
          setVisibleProjects(data.data.slice(0, 5));
          
          // Extract all project images
          const images = [];
          data.data.forEach(project => {
            if (project.main_image_url) {
              try {
                const parsed = JSON.parse(project.main_image_url);
                if (Array.isArray(parsed)) {
                  parsed.forEach(img => {
                    const url = typeof img === 'string' ? img : img.url;
                    if (url) images.push(getImageUrl(url));
                  });
                } else {
                  images.push(getImageUrl(project.main_image_url));
                }
              } catch {
                images.push(getImageUrl(project.main_image_url));
              }
            }
          });
          setProjectImages(images);
          // After initial load, disable the intro animation for images
          timeoutId = setTimeout(() => setIsImageInitialLoad(false), 2000);
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    };
    fetchProjects();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Fetch profiles on mount
  useEffect(() => {
    let timeoutId;
    const fetchProfiles = async () => {
      try {
        const data = await profilesAPI.getAll({ limit: 30 });
        if (data.success) {
          setProfiles(data.data);
          // Initialize with first 5 profiles
          setVisibleProfiles(data.data.slice(0, 5));
          // After initial load, disable the intro animation
          timeoutId = setTimeout(() => setIsInitialLoad(false), 2000);
        }
      } catch (err) {
        console.error('Error fetching profiles:', err);
      }
    };
    fetchProfiles();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Rotate background images
  useEffect(() => {
    if (projectImages.length === 0 || isImageInitialLoad) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % projectImages.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [projectImages.length, isImageInitialLoad]);

  // Rotate profile avatars - one at a time, fade in place
  useEffect(() => {
    if (profiles.length < 6 || isInitialLoad) return; // Need more than 5 to cycle
    
    let nextProfileIndex = 5; // Start from the 6th profile
    let interval;
    
    // Add a delay before starting the cycling
    const startDelay = setTimeout(() => {
      interval = setInterval(() => {
        setVisibleProfiles(prev => {
          // Pick a random position to update (0-4)
          const positionToUpdate = Math.floor(Math.random() * 5);
          const newProfiles = [...prev];
          newProfiles[positionToUpdate] = profiles[nextProfileIndex];
          nextProfileIndex = (nextProfileIndex + 1) % profiles.length;
          return newProfiles;
        });
      }, 3000); // Change one person every 3 seconds
    }, 1000); // Wait 1 second after initial animation finishes

    return () => {
      clearTimeout(startDelay);
      if (interval) clearInterval(interval);
    };
  }, [profiles.length, isInitialLoad]); // Removed profiles from dependencies

  // Rotate project icons - one at a time, fade in place
  useEffect(() => {
    if (projects.length < 6 || isInitialLoad) return; // Need more than 5 to cycle
    
    let nextProjectIndex = 5; // Start from the 6th project
    let interval;
    
    // Add a delay before starting the cycling
    const startDelay = setTimeout(() => {
      interval = setInterval(() => {
        setVisibleProjects(prev => {
          // Pick a random position to update (0-4)
          const positionToUpdate = Math.floor(Math.random() * 5);
          const newProjects = [...prev];
          newProjects[positionToUpdate] = projects[nextProjectIndex];
          nextProjectIndex = (nextProjectIndex + 1) % projects.length;
          return newProjects;
        });
      }, 3000); // Change one project every 3 seconds
    }, 1000); // Wait 1 second after initial animation finishes

    return () => {
      clearTimeout(startDelay);
      if (interval) clearInterval(interval);
    };
  }, [projects.length, isInitialLoad]); // Removed projects from dependencies

  // Holographic effect handlers for people card
  const handlePeopleCardMouseMove = (e) => {
    if (!peopleCardRef.current) return;
    const rect = peopleCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const maxRotation = 5;
    const rotateX = ((y - centerY) / centerY) * -maxRotation;
    const rotateY = ((x - centerX) / centerX) * maxRotation;
    
    peopleCardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    
    const holoElement = peopleCardRef.current.querySelector('.holo-effect');
    if (holoElement) {
      holoElement.style.backgroundPosition = `${(x / rect.width) * 100}% ${(y / rect.height) * 100}%`;
    }
  };
  
  const handlePeopleCardMouseLeave = () => {
    if (!peopleCardRef.current) return;
    peopleCardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
  };

  // Holographic effect handlers for projects card
  const handleProjectsCardMouseMove = (e) => {
    if (!projectsCardRef.current) return;
    const rect = projectsCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const maxRotation = 5;
    const rotateX = ((y - centerY) / centerY) * -maxRotation;
    const rotateY = ((x - centerX) / centerX) * maxRotation;
    
    projectsCardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    
    const holoElement = projectsCardRef.current.querySelector('.holo-effect');
    if (holoElement) {
      holoElement.style.backgroundPosition = `${(x / rect.width) * 100}% ${(y / rect.height) * 100}%`;
    }
  };
  
  const handleProjectsCardMouseLeave = () => {
    if (!projectsCardRef.current) return;
    projectsCardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{backgroundColor: '#1a1a1a'}}>
      {/* Background Image Slideshow */}
      {projectImages.length > 0 && (
        <>
          {projectImages.map((image, index) => (
            <div
              key={index}
              className="absolute inset-0 transition-opacity duration-1000"
              style={{
                opacity: index === currentImageIndex ? 1 : 0,
                zIndex: 0,
                animation: index === 0 && isImageInitialLoad ? 'fadeIn 1s ease-in' : 'none',
              }}
            >
              <img
                src={image}
                alt="Project background"
                className="w-full h-full object-cover"
                style={{
                  filter: 'blur(4px)',
                  transform: 'scale(1.1)',
                }}
              />
            </div>
          ))}
          {/* Dark overlay for readability */}
          <div 
            className="absolute inset-0" 
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.8))',
              zIndex: 1,
              animation: isImageInitialLoad ? 'fadeIn 1s ease-in' : 'none',
            }}
          />
        </>
      )}

      {/* Logo - Top Left */}
      <div className="fixed left-2 sm:left-4 top-2 sm:top-4 z-50">
        <a href="/" className="hover:opacity-80 transition-opacity cursor-pointer block">
          <img 
            src="/pursuit-wordmark.png" 
            alt="Pursuit" 
            className="h-5 sm:h-6 md:h-8"
            style={{
              filter: 'brightness(0) invert(1)',
            }}
          />
        </a>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen py-8 pt-16 sm:pt-8">
        <div className="max-w-6xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-8 sm:mb-12 md:mb-16 px-4 sm:px-8">
            <h1 
              className="font-bold uppercase tracking-tight mb-3 sm:mb-4 text-white" 
              style={{
                fontFamily: "'Galano Grotesque', sans-serif", 
                fontSize: 'clamp(2rem, 9vw, 4rem)',
                lineHeight: '1.1',
                textShadow: '0 2px 10px rgba(0,0,0,0.5)'
              }}
            >
              THE PURSUIT LOOKBOOK
            </h1>
            <p className="text-base sm:text-lg md:text-xl mb-8 text-white" style={{fontSize: 'clamp(1.125rem, 3vw, 1.5rem)', textShadow: '0 2px 10px rgba(0,0,0,0.5)'}}>
              Discover talented individuals and innovative projects
            </p>
          </div>

          {/* Feature Cards */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-stretch px-4 sm:px-8">
            {/* People Card */}
            <div 
              ref={peopleCardRef}
              className="person-card-wrapper"
              style={{
                transformStyle: 'preserve-3d',
                WebkitTransformStyle: 'preserve-3d',
                cursor: 'pointer'
              }}
              onMouseMove={handlePeopleCardMouseMove}
              onMouseLeave={handlePeopleCardMouseLeave}
            >
            <Card 
              className="rounded-xl border-2 border-white shadow-lg hover:shadow-2xl transition-all cursor-pointer overflow-hidden sm:max-w-[300px] relative"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                backdropFilter: 'blur(10px)',
                width: '100%',
                height: '320px',
                animation: 'slideUpFadeIn 0.8s ease-out',
                animationDelay: '0.3s',
                animationFillMode: 'both'
              }}
              onClick={() => navigate('/people')}
            >
              {/* Holographic Effect Overlay */}
              <div className="holo-effect absolute inset-0 opacity-0 hover:opacity-30 transition-opacity duration-300 pointer-events-none"></div>
              
              <CardContent className="p-8 h-full flex flex-col justify-between relative z-10">
                <div>
                  {/* Profile Avatars */}
                  <div 
                    className="mb-6 flex -space-x-3 relative" 
                    style={{height: '64px'}}
                  >
                    {visibleProfiles.map((profile, i) => (
                      <div 
                        key={`${i}-${profile.slug}`}
                        className="w-16 h-16 rounded-full border-4 border-white overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm font-semibold"
                        title={`${profile.user?.first_name || ''} ${profile.user?.last_name || ''}`}
                        style={{
                          animation: isInitialLoad ? `slideInRight 0.6s ease-out` : 'fadeIn 0.4s ease-in',
                          animationDelay: isInitialLoad ? `${i * 0.1}s` : '0s',
                          animationFillMode: 'both',
                          zIndex: i
                        }}
                      >
                        {(profile.photo_url || profile.photoUrl) ? (
                          <img 
                            src={getImageUrl(profile.photo_url || profile.photoUrl)}
                            alt={`${profile.user?.first_name || ''} ${profile.user?.last_name || ''}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>
                            {profile.user?.first_name?.charAt(0)}{profile.user?.last_name?.charAt(0)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <style>{`
                    @keyframes slideInRight {
                      0% {
                        opacity: 0;
                        transform: translateX(30px) scale(0.7);
                      }
                      100% {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                      }
                    }
                    @keyframes fadeIn {
                      0% {
                        opacity: 0;
                      }
                      100% {
                        opacity: 1;
                      }
                    }
                    @keyframes slideUpFadeIn {
                      0% {
                        opacity: 0;
                        transform: translateY(30px);
                      }
                      100% {
                        opacity: 1;
                        transform: translateY(0);
                      }
                    }
                    @keyframes scaleIn {
                      0% {
                        opacity: 0;
                        transform: scale(0.5);
                      }
                      100% {
                        opacity: 1;
                        transform: scale(1);
                      }
                    }
                  `}</style>
                  <h3 
                    className="font-bold text-2xl mb-3 uppercase"
                    style={{fontFamily: "'Galano Grotesque', sans-serif"}}
                  >
                    Talented People
                  </h3>
                  <p className="text-gray-600 mb-6" style={{fontSize: '1rem'}}>
                    Browse profiles of Pursuit's Builders and Fellows—skilled professionals with diverse expertise and backgrounds
                  </p>
                </div>
                <div className="flex items-center gap-2 font-semibold" style={{color: '#4242ea'}}>
                  Explore People <ArrowRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
            </div>

            {/* Projects Card */}
            <div 
              ref={projectsCardRef}
              className="project-card-wrapper"
              style={{
                transformStyle: 'preserve-3d',
                WebkitTransformStyle: 'preserve-3d',
                cursor: 'pointer'
              }}
              onMouseMove={handleProjectsCardMouseMove}
              onMouseLeave={handleProjectsCardMouseLeave}
            >
            <Card 
              className="rounded-xl border-2 border-white shadow-lg hover:shadow-2xl transition-all cursor-pointer overflow-hidden sm:max-w-[300px] relative"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                backdropFilter: 'blur(10px)',
                width: '100%',
                height: '320px',
                animation: 'slideUpFadeIn 0.8s ease-out',
                animationDelay: '0.5s',
                animationFillMode: 'both'
              }}
              onClick={() => navigate('/projects')}
            >
              {/* Holographic Effect Overlay */}
              <div className="holo-effect absolute inset-0 opacity-0 hover:opacity-30 transition-opacity duration-300 pointer-events-none"></div>
              
              <CardContent className="p-8 h-full flex flex-col justify-between relative z-10">
                <div>
                  {/* Project Icons */}
                  <div 
                    className="mb-6 flex -space-x-3 relative" 
                    style={{height: '64px'}}
                  >
                    {visibleProjects.map((project, i) => {
                      // Get project icon or first image
                      let imageUrl = null;
                      if (project.icon_url) {
                        imageUrl = getImageUrl(project.icon_url);
                      } else if (project.main_image_url) {
                        try {
                          const parsed = JSON.parse(project.main_image_url);
                          if (Array.isArray(parsed) && parsed.length > 0) {
                            const url = typeof parsed[0] === 'string' ? parsed[0] : parsed[0].url;
                            imageUrl = getImageUrl(url);
                          } else {
                            imageUrl = getImageUrl(project.main_image_url);
                          }
                        } catch {
                          imageUrl = getImageUrl(project.main_image_url);
                        }
                      }

                      return (
                        <div
                          key={`${i}-${project.slug}`}
                          className="w-16 h-16 rounded-full border-4 border-white overflow-hidden bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-sm font-semibold"
                          title={project.name}
                          style={{
                            animation: isInitialLoad ? `slideInRight 0.6s ease-out` : 'fadeIn 0.4s ease-in',
                            animationDelay: isInitialLoad ? `${i * 0.1}s` : '0s',
                            animationFillMode: 'both',
                            zIndex: i
                          }}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={project.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Briefcase className="w-8 h-8 text-white" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <h3 
                    className="font-bold text-2xl mb-3 uppercase"
                    style={{fontFamily: "'Galano Grotesque', sans-serif"}}
                  >
                    Amazing Projects
                  </h3>
                  <p className="text-gray-600 mb-6" style={{fontSize: '1rem'}}>
                    Discover innovative projects built by Builders and Fellows across various industries and technologies
                  </p>
                </div>
                <div className="flex items-center gap-2 font-semibold" style={{color: '#4242ea'}}>
                  View Projects <ArrowRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 sm:mt-12 md:mt-16 text-white px-4 sm:px-8">
            <p className="text-xs sm:text-sm" style={{textShadow: '0 2px 10px rgba(0,0,0,0.5)'}}>
              Built with ♥ by Pursuit + AI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
