import { cache } from 'react';
import { db } from '@/lib/db';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const PUBLIC_PROFILE_SELECT = {
  id: true,
  name: true,
  handle: true,
  bio: true,
  image: true,
  buttonStyle: true,
  themePalette: true,
  links: {
    orderBy: {
      order: 'asc',
    },
    select: {
      id: true,
      title: true,
      url: true,
      archived: true,
      order: true,
      isSocial: true,
    },
  },
};

async function getPublicProfile(handle) {
  const existingUser = await db.user.findUnique({
    where: {
      handle,
    },
    select: PUBLIC_PROFILE_SELECT,
  });

  if (existingUser?.id) {
    return existingUser;
  }

  const matchingUsers = await db.user.aggregateRaw({
    pipeline: [
      {
        $match: {
          handle: {
            $regex: `^\\s*${escapeRegex(handle)}\\s*$`,
            $options: 'i',
          },
        },
      },
      {
        $project: {
          _id: 1,
        },
      },
      {
        $limit: 1,
      },
    ],
  });

  const matchedUserId =
    typeof matchingUsers[0]?._id === 'string'
      ? matchingUsers[0]._id
      : matchingUsers[0]?._id?.$oid;

  if (typeof matchedUserId !== 'string') {
    return null;
  }

  return db.user.findUnique({
    where: {
      id: matchedUserId,
    },
    select: PUBLIC_PROFILE_SELECT,
  });
}

export const loadPublicProfile = cache(getPublicProfile);
