# Moodle Plugin Types Reference

Complete list of Moodle plugin types, their directory locations, and frankenstyle naming.

## Core Plugin Types

| Type | Directory | Frankenstyle | Description |
|------|-----------|-------------|-------------|
| Activity module | `mod/` | `mod_name` | Course activities (assign, quiz, forum) |
| Block | `blocks/` | `block_name` | Side blocks on pages |
| Theme | `theme/` | `theme_name` | Visual themes |
| Local plugin | `local/` | `local_name` | General-purpose plugins |
| Admin tool | `admin/tool/` | `tool_name` | Admin site tools |
| Report | `report/` | `report_name` | Site-level reports |
| Course report | `course/report/` | `coursereport_name` | Course-level reports |
| Authentication | `auth/` | `auth_name` | Authentication methods |
| Enrollment | `enrol/` | `enrol_name` | Enrollment methods |
| Repository | `repository/` | `repository_name` | File repositories |
| Portfolio | `portfolio/` | `portfolio_name` | Portfolio exports |
| Filter | `filter/` | `filter_name` | Text filters |
| Message output | `message/output/` | `message_name` | Message delivery |
| Question type | `question/type/` | `qtype_name` | Question types for quizzes |
| Question behaviour | `question/behaviour/` | `qbehaviour_name` | How questions are scored |
| Question format | `question/format/` | `qformat_name` | Question import/export |
| Assignment submission | `mod/assign/submission/` | `assignsubmission_name` | Submission types |
| Assignment feedback | `mod/assign/feedback/` | `assignfeedback_name` | Feedback types |
| Availability condition | `availability/condition/` | `availability_name` | Access restrictions |
| Calendar type | `calendar/type/` | `calendartype_name` | Calendar systems |
| Data field | `mod/data/field/` | `datafield_name` | Database activity fields |
| Data preset | `mod/data/preset/` | `datapreset_name` | Database presets |
| Editor | `lib/editor/` | `editor_name` | Text editors |
| Atto plugin | `lib/editor/atto/plugins/` | `atto_name` | Atto editor plugins |
| TinyMCE plugin | `lib/editor/tiny/plugins/` | `tiny_name` | TinyMCE editor plugins |
| Format | `course/format/` | `format_name` | Course formats |
| Grade export | `grade/export/` | `gradeexport_name` | Grade exports |
| Grade import | `grade/import/` | `gradeimport_name` | Grade imports |
| Grade report | `grade/report/` | `gradereport_name` | Grade reports |
| Log store | `admin/tool/log/store/` | `logstore_name` | Log storage backends |
| LTI source | `mod/lti/source/` | `ltisource_name` | LTI sources |
| Media player | `media/player/` | `media_name` | Media players |
| Plagiarism | `plagiarism/` | `plagiarism_name` | Plagiarism detection |
| Quiz access rule | `mod/quiz/accessrule/` | `quizaccess_name` | Quiz access rules |
| Quiz report | `mod/quiz/report/` | `quiz_name` | Quiz reports |
| SCORM report | `mod/scorm/report/` | `scormreport_name` | SCORM reports |
| Search engine | `search/engine/` | `search_name` | Search backends |
| Web service protocol | `webservice/` | `webservice_name` | WS protocols |
| Workshop assessment | `mod/workshop/form/` | `workshopform_name` | Workshop grading |
| Workshop allocation | `mod/workshop/allocation/` | `workshopallocation_name` | Workshop allocation |
| Workshop evaluation | `mod/workshop/eval/` | `workshopeval_name` | Workshop evaluation |
| Content type | `contentbank/contenttype/` | `contenttype_name` | Content bank types |
| Payment gateway | `payment/gateway/` | `paygw_name` | Payment gateways |
| Communication provider | `communication/provider/` | `communication_name` | Communication channels |

## Frankenstyle Naming Rules

1. Format: `type_name` (e.g., `mod_forum`, `local_greetings`)
2. Name must be lowercase alphanumeric (no hyphens, no underscores except the type separator)
3. Name must match the directory name
4. The `component` field in `version.php` must match exactly

## Directory Structure in Playground

In the playground MEMFS, the Moodle root is at `/www/moodle/` (versions 4.4–5.0) or `/www/moodle/public/` (versions 5.1+, where `public/` is the docroot).

For Moodle 5.0 and earlier:
```
/www/moodle/local/myplugin/
/www/moodle/mod/myactivity/
/www/moodle/blocks/myblock/
```

For Moodle 5.1 and later:
```
/www/moodle/local/myplugin/
/www/moodle/mod/myactivity/
/www/moodle/blocks/myblock/
```

Note: Even in 5.1+, plugin directories remain relative to the Moodle root (not the `public/` docroot). The `public/` directory only affects the web-accessible entry points.
