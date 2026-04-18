export default function Footer() {

  return (
    <footer className="bg-green-900 text-white">
        <div className="max-w-5xl mx-auto px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
        {/* About */}
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">
            ReadMore Library
            </h3>
            <p className="text-sm text-white-100 leading-relaxed max-w-xs mx-auto md:mx-0">
            A modern library system designed
            to make borrowing books, devices, and reserving rooms simple and accessible.
            </p>
        </div>

        {/* Hours */}
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">
            Hours
            </h3>
            <p className="text-sm text-white-100"> Open Monday through Sunday: 
                <br></br>8:00 AM – 9:00 PM
            </p>
        </div>

        {/* Find us */}
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">
            Find Us
            </h3>
            <p className="text-sm text-white-100">4333 University Drive</p>
            <p className="text-sm text-white-100">Houston, TX 77204</p>
            <p className="text-sm text-white-100">(713) 743-1050</p>
        </div>
        </div>

        <div className="border-t border-green-800"></div>

        <div className="text-center text-xs text-white-200 py-4">
        © {new Date().getFullYear()} ReadMore Library. All rights reserved.
        </div>
    </footer>
    );
}