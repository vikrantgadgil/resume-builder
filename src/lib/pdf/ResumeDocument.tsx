import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Certification, Education, ProfileHeader, Role } from "@/types/profile";

export type ResumeDocumentData = {
  header: ProfileHeader;
  roles: { role: Role; bullets: string[] }[];
  education: Education[];
  certifications: Certification[];
  highlights: string[];
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 44,
    color: "#000000",
  },
  name: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  contactLine: {
    fontSize: 10,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 4,
  },
  roleBlock: {
    marginBottom: 8,
  },
  roleHeading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  roleMeta: {
    fontSize: 10,
    marginBottom: 3,
  },
  bulletLine: {
    fontSize: 10,
    marginBottom: 2,
    paddingLeft: 10,
  },
  educationBlock: {
    marginBottom: 6,
  },
  educationHeading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  educationMeta: {
    fontSize: 10,
  },
  certificationLine: {
    fontSize: 10,
    marginBottom: 2,
  },
  highlightLine: {
    fontSize: 10,
    marginBottom: 2,
  },
});

function dateRange(startDate: string, endDate: string): string {
  if (!startDate && !endDate) return "";
  if (!endDate) return startDate;
  return `${startDate} - ${endDate}`;
}

export function ResumeDocument({ data }: { data: ResumeDocumentData }) {
  const { header, roles, education, certifications, highlights } = data;

  const contactParts = [
    header.email,
    header.phone,
    header.location,
    header.linkedin,
    header.github,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        {header.name ? <Text style={styles.name}>{header.name}</Text> : null}
        {contactParts.length > 0 ? (
          <Text style={styles.contactLine}>{contactParts.join(" | ")}</Text>
        ) : null}

        {roles.length > 0 ? (
          <View>
            <Text style={styles.sectionHeading}>Experience</Text>
            {roles.map(({ role, bullets }) => (
              <View key={role.id} style={styles.roleBlock} wrap={false}>
                <Text style={styles.roleHeading}>
                  {[role.title, role.employer].filter(Boolean).join(", ")}
                </Text>
                <Text style={styles.roleMeta}>
                  {[dateRange(role.startDate, role.endDate), role.location]
                    .filter(Boolean)
                    .join(" | ")}
                </Text>
                {bullets.map((bullet, index) => (
                  <Text key={index} style={styles.bulletLine}>
                    - {bullet}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {education.length > 0 ? (
          <View>
            <Text style={styles.sectionHeading}>Education</Text>
            {education.map((entry) => (
              <View key={entry.id} style={styles.educationBlock} wrap={false}>
                <Text style={styles.educationHeading}>
                  {[entry.degree, entry.institution].filter(Boolean).join(", ")}
                </Text>
                <Text style={styles.educationMeta}>
                  {[entry.field, entry.year].filter(Boolean).join(", ")}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {certifications.length > 0 ? (
          <View>
            <Text style={styles.sectionHeading}>Certifications</Text>
            {certifications.map((entry) => (
              <Text key={entry.id} style={styles.certificationLine}>
                {[entry.name, entry.issuer, entry.year]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            ))}
          </View>
        ) : null}

        {highlights.length > 0 ? (
          <View>
            <Text style={styles.sectionHeading}>Selected Highlights</Text>
            {highlights.map((highlight, index) => (
              <Text key={index} style={styles.highlightLine}>
                {highlight}
              </Text>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
