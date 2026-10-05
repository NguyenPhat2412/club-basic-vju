package vn.vju.clubbasic;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNull;

class ClubBasicApplicationTest {
  @Test
  void globalGrantsAlwaysUseTheCanonicalNullResource() {
    assertNull(new ClubBasicApplication.Grant("club.view", ClubBasicApplication.Scope.GLOBAL, "club-1").resourceId());
  }

  @Test
  void blankResourceIdsAreCanonicalizedToNull() {
    assertNull(new ClubBasicApplication.Grant("club.view", ClubBasicApplication.Scope.CLUB, "").resourceId());
  }
}
