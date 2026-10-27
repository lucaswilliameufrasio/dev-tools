import { describe, expect, it } from 'vitest';
import { convertCase, splitWords } from './textcase';

describe('textcase', () => {
	it('splits mixed styles into words', () => {
		expect(splitWords('parseHTTPResponse_v2-final')).toEqual(['parse', 'HTTP', 'Response', 'v2', 'final']);
	});

	it('converts between styles', () => {
		expect(convertCase('user profile id', 'camel')).toBe('userProfileId');
		expect(convertCase('userProfileId', 'snake')).toBe('user_profile_id');
		expect(convertCase('user_profile_id', 'constant')).toBe('USER_PROFILE_ID');
		expect(convertCase('user_profile_id', 'kebab')).toBe('user-profile-id');
		expect(convertCase('user_profile_id', 'pascal')).toBe('UserProfileId');
		expect(convertCase('user_profile_id', 'title')).toBe('User Profile Id');
	});
});
