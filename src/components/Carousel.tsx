import React, { useState } from 'react';

interface CarouselProps {
  children: React.ReactNode;
}

function Carousel({ children }: CarouselProps) {
  const slides = React.Children.toArray(children); // Convert children to an array
  const [currentIndex, setCurrentIndex] = useState(0);

  // Navigate to the previous slide
  const handlePrev = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? slides.length - 1 : prevIndex - 1
    );
  };

  // Navigate to the next slide
  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === slides.length - 1 ? 0 : prevIndex + 1
    );
  };

  return (
    <div className="relative overflow-hidden w-full">
      {/* The carousel slides */}
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
        }}
      >
        {slides.map((slide, index) => (
          <div key={index} className="flex-shrink-0 w-full">
            {slide}
          </div>
        ))}
      </div>

      {/* Navigation buttons */}
      <button
        onClick={handlePrev}
        className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black text-white p-2 rounded-full"
      >
        &#10094;
      </button>
      <button
        onClick={handleNext}
        className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black text-white p-2 rounded-full"
      >
        &#10095;
      </button>
    </div>
  );
}

export default Carousel;
