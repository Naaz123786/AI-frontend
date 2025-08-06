interface MobilePreviewProps {
  children: React.ReactNode;
}

export default function MobilePreview({ children }: MobilePreviewProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Mobile Frame */}
      <div className="relative">
        {/* Phone Frame */}
        <div className="w-80 h-[640px] bg-black rounded-[2.5rem] p-2 shadow-2xl">
          {/* Screen */}
          <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden">
            {/* Status Bar */}
            <div className="bg-white h-6 flex items-center justify-between px-4 text-black text-sm">
              <span className="font-medium">9:41</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-2 border border-black rounded-sm">
                  <div className="w-3 h-1 bg-black rounded-sm m-[1px]"></div>
                </div>
              </div>
            </div>
            
            {/* App Content */}
            <div className="flex-1 overflow-auto">
              {children}
            </div>
            
            {/* Home Indicator */}
            <div className="h-4 flex items-center justify-center">
              <div className="w-32 h-1 bg-black rounded-full opacity-30"></div>
            </div>
          </div>
        </div>
        
        {/* Home Button */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gray-800 rounded-full border-2 border-gray-600"></div>
      </div>
    </div>
  );
}
