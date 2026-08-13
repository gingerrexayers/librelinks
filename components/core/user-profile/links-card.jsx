import Image from 'next/image';

const AngelWing = ({ mirrored }) => (
  <svg
    viewBox="0 0 291 165"
    fill="none"
    aria-hidden="true"
    className="h-auto w-full overflow-visible"
    style={{
      transform: mirrored ? 'scaleX(-1)' : undefined,
      filter: 'drop-shadow(0 0 6px rgba(255, 213, 74, 0.75))',
    }}
  >
    <path
      fill="#ffffff"
      d="M 0 127 L 7 106 L 23 81 L 39 66 L 55 57 L 77 51 L 156 52 L 203 47 L 232 39 L 256 28 L 276 14 L 288 1 L 287 9 L 276 33 L 253 51 L 206 69 L 139 83 L 172 85 L 210 80 L 234 72 L 250 64 L 265 53 L 256 71 L 242 88 L 218 96 L 167 103 L 116 104 L 146 112 L 186 113 L 226 103 L 226 105 L 213 113 L 188 121 L 165 124 L 96 123 L 133 131 L 128 138 L 119 144 L 90 137 L 54 121 L 57 128 L 68 139 L 78 145 L 94 149 L 96 152 L 67 148 L 41 138 L 54 153 L 42 153 L 14 143 L 20 154 L 35 163 L 49 163 L 57 159 L 60 155 L 74 161 L 100 163 L 121 154 L 130 145 L 138 131 L 175 133 L 212 126 L 237 111 L 262 81 L 280 42 L 290 0 L 269 15 L 249 25 L 220 34 L 157 41 L 82 40 L 56 46 L 34 59 L 19 75 L 4 105 Z"
    />
  </svg>
);

const LinkCard = (props) => {
  const isTransparent = props.buttonStyle.includes('bg-transparent');

  const style = {
    background: isTransparent ? 'transparent' : props.theme.secondary,
    border: `1.5px solid ${props.theme.neutral}`,
    boxShadow: `5px 5px 0 0 ${props.theme.neutral}`,
  };

  return (
    <a
      href={props.url}
      onClick={props.registerClicks}
      target="_blank"
      rel="noopener noreferrer"
      className="angel-link-card relative block mb-3 w-full sm:w-64 md:w-72 lg:w-96 xl:w-3/4 2xl:w-3/5 max-w-3xl lg:mb-6 hover:scale-105 transition-all hover:z-10 focus-visible:z-10"
      style={{ display: props.archived ? 'none' : 'block' }}
    >
      <span className="angel-halo" aria-hidden="true" />
      <span className="angel-wing angel-wing-left" aria-hidden="true">
        <AngelWing mirrored />
      </span>
      <span className="angel-wing angel-wing-right" aria-hidden="true">
        <AngelWing />
      </span>
      <div
        className={`relative z-[1] flex items-center ${props.buttonStyle} border lg:p-1`}
        style={style}
      >
        <div className="flex text-center w-full">
          <div className="w-10 h-10">
            {props.image && (
              <Image
                className="rounded-full"
                alt={props.title}
                src={props.image}
                width={40}
                height={40}
              />
            )}
          </div>
          <h2
            style={{ color: props.theme.accent }}
            className="text-[13px] flex justify-center items-center font-semibold w-full text-gray-700 -ml-10 lg:text-lg"
          >
            {props.title}
          </h2>
        </div>
      </div>
    </a>
  );
};

export default LinkCard;
