import { useMemo } from 'react';

import { useGetDesignSpaces } from 'src/actions/design-space';
import {
  type DesignSpaceType,
  DEFAULT_DESIGN_SPACE_TYPE,
  normalizeDesignSpaceType,
} from 'src/utils/design-space-type';

// ----------------------------------------------------------------------

export function useCustomerDesignSpaceType(customerId?: string) {
  const { designSpaces, designSpacesLoading } = useGetDesignSpaces(customerId);

  const designType = useMemo<DesignSpaceType>(() => {
    if (!customerId) {
      return DEFAULT_DESIGN_SPACE_TYPE;
    }

    return normalizeDesignSpaceType(designSpaces[0]?.designType);
  }, [customerId, designSpaces]);

  return {
    designType,
    designSpacesLoading: Boolean(customerId) && designSpacesLoading,
  };
}
